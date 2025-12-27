import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const TABLES_TO_BACKUP = [
  'books',
  'categories',
  'profiles',
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
  'notifications'
];

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting backup process...');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Create admin client
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Check if this is an authenticated admin request or cron job
    const authHeader = req.headers.get('Authorization');
    let isAdmin = false;
    let userId: string | null = null;

    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
      
      if (user && !error) {
        userId = user.id;
        // Check if user is admin
        const { data: roleData } = await supabaseAdmin
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .eq('role', 'admin')
          .maybeSingle();
        
        isAdmin = !!roleData;
      }
    } else {
      // Allow cron jobs (no auth header but valid request)
      isAdmin = true;
    }

    if (!isAdmin) {
      console.log('Unauthorized backup attempt');
      return new Response(
        JSON.stringify({ error: 'Unauthorized - Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Fetching data from tables...');

    const backupData: Record<string, unknown[]> = {};
    const recordsCounts: Record<string, number> = {};

    // Fetch data from each table
    for (const table of TABLES_TO_BACKUP) {
      try {
        const { data, error } = await supabaseAdmin
          .from(table)
          .select('*');

        if (error) {
          console.error(`Error fetching ${table}:`, error.message);
          backupData[table] = [];
          recordsCounts[table] = 0;
        } else {
          backupData[table] = data || [];
          recordsCounts[table] = data?.length || 0;
          console.log(`Fetched ${recordsCounts[table]} records from ${table}`);
        }
      } catch (err) {
        console.error(`Failed to fetch ${table}:`, err);
        backupData[table] = [];
        recordsCounts[table] = 0;
      }
    }

    // Create backup file
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `backup-${timestamp}.json`;
    const filePath = `backups/${fileName}`;

    const backupContent = JSON.stringify({
      created_at: new Date().toISOString(),
      version: '1.0',
      tables: TABLES_TO_BACKUP,
      data: backupData,
      metadata: {
        total_records: Object.values(recordsCounts).reduce((a, b) => a + b, 0),
        records_per_table: recordsCounts
      }
    }, null, 2);

    const backupBlob = new Blob([backupContent], { type: 'application/json' });

    console.log('Uploading backup to storage...');

    // Upload to storage
    const { error: uploadError } = await supabaseAdmin.storage
      .from('backups')
      .upload(filePath, backupBlob, {
        contentType: 'application/json',
        upsert: false
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      throw new Error(`Failed to upload backup: ${uploadError.message}`);
    }

    console.log('Recording backup in history...');

    // Record in backup_history using service role (bypass RLS)
    const { error: historyError } = await supabaseAdmin
      .from('backup_history')
      .insert({
        file_name: fileName,
        file_path: filePath,
        file_size: backupContent.length,
        tables_backed_up: TABLES_TO_BACKUP,
        records_count: recordsCounts,
        status: 'completed',
        created_by: userId
      });

    if (historyError) {
      console.error('History error:', historyError);
      // Don't throw - backup was successful, just history failed
    }

    console.log('Backup completed successfully!');

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Backup completed successfully',
        file_name: fileName,
        file_path: filePath,
        file_size: backupContent.length,
        tables_backed_up: TABLES_TO_BACKUP,
        records_count: recordsCounts,
        total_records: Object.values(recordsCounts).reduce((a, b) => a + b, 0)
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const err = error as Error;
    console.error('Backup error:', err);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: err.message || 'An error occurred during backup' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
