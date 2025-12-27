import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Order matters for foreign key constraints - delete in reverse order, insert in correct order
const TABLES_ORDER = [
  'notifications',
  'user_settings',
  'discussion_replies',
  'discussions',
  'reading_list_books',
  'reading_lists',
  'book_bookmarks',
  'book_annotations',
  'book_reviews',
  'reading_progress',
  'favorites',
  'books',
  'categories',
  'profiles',
];

// Reverse order for deletion (to respect foreign keys)
const DELETE_ORDER = [...TABLES_ORDER].reverse();

// Tables that should be restored (insert order respects dependencies)
const INSERT_ORDER = [
  'categories',
  'profiles',
  'books',
  'favorites',
  'reading_progress',
  'book_reviews',
  'book_annotations',
  'book_bookmarks',
  'reading_lists',
  'reading_list_books',
  'discussions',
  'discussion_replies',
  'user_settings',
  'notifications',
];

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting restore process...');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Create admin client
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Check if this is an authenticated admin request
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user is admin
    const { data: roleData } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();
    
    if (!roleData) {
      console.log('Unauthorized restore attempt by:', user.id);
      return new Response(
        JSON.stringify({ error: 'Unauthorized - Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get request body
    const { file_path, options } = await req.json();
    
    if (!file_path) {
      return new Response(
        JSON.stringify({ error: 'file_path is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const skipTables = options?.skip_tables || [];
    const clearExisting = options?.clear_existing !== false; // Default to true

    console.log('Downloading backup file:', file_path);

    // Download backup file from storage
    const { data: fileData, error: downloadError } = await supabaseAdmin.storage
      .from('backups')
      .download(file_path);

    if (downloadError || !fileData) {
      console.error('Download error:', downloadError);
      return new Response(
        JSON.stringify({ error: 'Failed to download backup file' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse backup content
    const backupContent = await fileData.text();
    const backup = JSON.parse(backupContent);

    if (!backup.data || !backup.tables) {
      return new Response(
        JSON.stringify({ error: 'Invalid backup file format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Backup loaded, version:', backup.version);
    console.log('Tables in backup:', backup.tables);

    const results: Record<string, { deleted: number; inserted: number; errors: string[] }> = {};

    // Clear existing data if requested
    if (clearExisting) {
      console.log('Clearing existing data...');
      
      for (const table of DELETE_ORDER) {
        if (skipTables.includes(table)) {
          console.log(`Skipping deletion for ${table}`);
          continue;
        }

        if (!backup.data[table]) {
          continue;
        }

        try {
          // Delete all records from the table
          const { error: deleteError, count } = await supabaseAdmin
            .from(table)
            .delete()
            .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all (neq ensures we get all)

          if (deleteError) {
            console.error(`Error clearing ${table}:`, deleteError.message);
            if (!results[table]) results[table] = { deleted: 0, inserted: 0, errors: [] };
            results[table].errors.push(`Delete failed: ${deleteError.message}`);
          } else {
            console.log(`Cleared ${table}`);
            if (!results[table]) results[table] = { deleted: 0, inserted: 0, errors: [] };
            results[table].deleted = count || 0;
          }
        } catch (err) {
          console.error(`Failed to clear ${table}:`, err);
          if (!results[table]) results[table] = { deleted: 0, inserted: 0, errors: [] };
          results[table].errors.push(`Delete exception: ${(err as Error).message}`);
        }
      }
    }

    // Insert backup data
    console.log('Restoring data...');
    
    for (const table of INSERT_ORDER) {
      if (skipTables.includes(table)) {
        console.log(`Skipping restoration for ${table}`);
        continue;
      }

      const tableData = backup.data[table];
      if (!tableData || tableData.length === 0) {
        console.log(`No data for ${table}`);
        continue;
      }

      if (!results[table]) results[table] = { deleted: 0, inserted: 0, errors: [] };

      try {
        // Insert in batches of 100 to avoid timeout
        const batchSize = 100;
        let insertedCount = 0;

        for (let i = 0; i < tableData.length; i += batchSize) {
          const batch = tableData.slice(i, i + batchSize);
          
          const { error: insertError, count } = await supabaseAdmin
            .from(table)
            .upsert(batch, { 
              onConflict: 'id',
              ignoreDuplicates: false 
            });

          if (insertError) {
            console.error(`Error inserting into ${table}:`, insertError.message);
            results[table].errors.push(`Insert batch ${i}-${i+batchSize} failed: ${insertError.message}`);
          } else {
            insertedCount += batch.length;
          }
        }

        results[table].inserted = insertedCount;
        console.log(`Restored ${insertedCount} records to ${table}`);
      } catch (err) {
        console.error(`Failed to restore ${table}:`, err);
        results[table].errors.push(`Insert exception: ${(err as Error).message}`);
      }
    }

    // Calculate summary
    const totalInserted = Object.values(results).reduce((acc, r) => acc + r.inserted, 0);
    const totalErrors = Object.values(results).reduce((acc, r) => acc + r.errors.length, 0);
    const tablesRestored = Object.keys(results).filter(t => results[t].inserted > 0).length;

    console.log('Restore completed!');
    console.log(`Total records restored: ${totalInserted}`);
    console.log(`Total errors: ${totalErrors}`);

    return new Response(
      JSON.stringify({
        success: totalErrors === 0,
        message: totalErrors === 0 
          ? 'Restore completed successfully' 
          : 'Restore completed with some errors',
        summary: {
          tables_restored: tablesRestored,
          total_records_restored: totalInserted,
          total_errors: totalErrors
        },
        details: results
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const err = error as Error;
    console.error('Restore error:', err);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: err.message || 'An error occurred during restore' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
