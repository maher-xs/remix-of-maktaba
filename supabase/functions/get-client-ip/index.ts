import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
    // Get client IP from various headers
    const forwardedFor = req.headers.get('x-forwarded-for');
    const realIp = req.headers.get('x-real-ip');
    const cfConnectingIp = req.headers.get('cf-connecting-ip');
    
    // Priority: CF > X-Real-IP > X-Forwarded-For (first IP)
    let clientIp = cfConnectingIp || realIp || (forwardedFor ? forwardedFor.split(',')[0].trim() : null);
    
    // Fallback if no IP found
    if (!clientIp) {
      clientIp = 'unknown';
    }

    console.log('Client IP detected:', clientIp);

    return new Response(
      JSON.stringify({ ip: clientIp }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );
  } catch (error) {
    console.error('Error getting client IP:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to get client IP', ip: 'unknown' }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );
  }
});