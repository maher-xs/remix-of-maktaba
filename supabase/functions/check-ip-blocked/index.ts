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
    const { ip_address } = await req.json();

    if (!ip_address) {
      return new Response(
        JSON.stringify({ blocked: false, error: 'No IP address provided' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Create Supabase client with service role key
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Check if IP is blocked
    const { data, error } = await supabase
      .from('blocked_ips')
      .select('id, expires_at, reason')
      .eq('ip_address', ip_address)
      .not('blocked_at', 'is', null)
      .maybeSingle();

    if (error) {
      console.error('Error checking blocked IP:', error);
      return new Response(
        JSON.stringify({ blocked: false, error: error.message }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Check if blocked and not expired
    if (data && data.expires_at) {
      const expiresAt = new Date(data.expires_at);
      if (expiresAt > new Date()) {
        console.log('IP is blocked:', ip_address, 'until:', data.expires_at);
        return new Response(
          JSON.stringify({ 
            blocked: true, 
            reason: data.reason,
            expires_at: data.expires_at 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        );
      }
    }

    return new Response(
      JSON.stringify({ blocked: false }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    console.error('Error in check-ip-blocked:', error);
    return new Response(
      JSON.stringify({ blocked: false, error: 'Internal server error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  }
});