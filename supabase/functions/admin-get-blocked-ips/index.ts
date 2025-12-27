import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('admin-get-blocked-ips: Starting request');
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    // Get the authorization header
    const authHeader = req.headers.get('Authorization');
    console.log('admin-get-blocked-ips: Auth header present:', !!authHeader);
    
    if (!authHeader) {
      console.log('admin-get-blocked-ips: No authorization header');
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    // Create client with user's token to verify identity
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      }
    });

    // Get the user
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    
    if (authError) {
      console.log('admin-get-blocked-ips: Auth error:', authError.message);
      return new Response(
        JSON.stringify({ error: 'Authentication failed', details: authError.message }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    if (!user) {
      console.log('admin-get-blocked-ips: No user found');
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    console.log('admin-get-blocked-ips: User authenticated:', user.id);

    // Use service role to check admin status and get data
    const adminSupabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check admin role
    const { data: roleData, error: roleError } = await adminSupabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (roleError) {
      console.log('admin-get-blocked-ips: Role check error:', roleError.message);
    }

    if (!roleData) {
      console.log('admin-get-blocked-ips: User is not admin');
      return new Response(
        JSON.stringify({ error: 'Access denied - Admin role required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
      );
    }

    console.log('admin-get-blocked-ips: User is admin, fetching blocked IPs');

    // Get blocked IPs
    const { data, error } = await adminSupabase
      .from('blocked_ips')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('admin-get-blocked-ips: Error fetching blocked IPs:', error);
      return new Response(
        JSON.stringify({ error: error.message }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    console.log('admin-get-blocked-ips: Successfully fetched', data?.length || 0, 'blocked IPs');

    return new Response(
      JSON.stringify(data || []),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    console.error('admin-get-blocked-ips: Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: String(error) }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});