import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  data?: Record<string, unknown>;
}

interface PushRequest {
  userId?: string;
  allUsers?: boolean;
  payload: PushPayload;
}

// Generate VAPID signature for web push
async function generateVapidSignature(
  endpoint: string,
  vapidPrivateKey: string,
  vapidPublicKey: string,
  subject: string
): Promise<{ authorization: string; cryptoKey: string }> {
  const urlParts = new URL(endpoint);
  const audience = `${urlParts.protocol}//${urlParts.host}`;

  // Create JWT header and payload
  const header = { typ: "JWT", alg: "ES256" };
  const payload = {
    aud: audience,
    exp: Math.floor(Date.now() / 1000) + 12 * 60 * 60, // 12 hours
    sub: subject,
  };

  // Base64url encode
  const encoder = new TextEncoder();
  const base64UrlEncode = (data: Uint8Array): string => {
    return btoa(String.fromCharCode(...data))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=/g, "");
  };

  const headerB64 = base64UrlEncode(encoder.encode(JSON.stringify(header)));
  const payloadB64 = base64UrlEncode(encoder.encode(JSON.stringify(payload)));
  const unsignedToken = `${headerB64}.${payloadB64}`;

  // Import private key
  const privateKeyBytes = Uint8Array.from(atob(vapidPrivateKey.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));
  
  // Create proper PKCS8 format for ES256
  const pkcs8Header = new Uint8Array([
    0x30, 0x41, 0x02, 0x01, 0x00, 0x30, 0x13, 0x06, 0x07, 0x2a, 0x86, 0x48,
    0xce, 0x3d, 0x02, 0x01, 0x06, 0x08, 0x2a, 0x86, 0x48, 0xce, 0x3d, 0x03,
    0x01, 0x07, 0x04, 0x27, 0x30, 0x25, 0x02, 0x01, 0x01, 0x04, 0x20
  ]);
  
  const pkcs8Key = new Uint8Array(pkcs8Header.length + privateKeyBytes.length);
  pkcs8Key.set(pkcs8Header);
  pkcs8Key.set(privateKeyBytes, pkcs8Header.length);

  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    pkcs8Key,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"]
  );

  // Sign the token
  const signature = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    cryptoKey,
    encoder.encode(unsignedToken)
  );

  const signatureB64 = base64UrlEncode(new Uint8Array(signature));
  const jwt = `${unsignedToken}.${signatureB64}`;

  return {
    authorization: `vapid t=${jwt}, k=${vapidPublicKey}`,
    cryptoKey: vapidPublicKey,
  };
}

async function sendPushToEndpoint(
  subscription: { endpoint: string; p256dh: string; auth: string },
  payload: PushPayload,
  vapidPrivateKey: string,
  vapidPublicKey: string
): Promise<boolean> {
  try {
    const vapidSignature = await generateVapidSignature(
      subscription.endpoint,
      vapidPrivateKey,
      vapidPublicKey,
      "mailto:maherzahra.xs@gmail.com"
    );

    // For now, we'll use a simpler approach - direct fetch with VAPID headers
    const response = await fetch(subscription.endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Encoding": "aes128gcm",
        TTL: "86400",
        Authorization: vapidSignature.authorization,
        "Crypto-Key": `p256ecdsa=${vapidSignature.cryptoKey}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      console.error(`Push failed for ${subscription.endpoint}:`, response.status, await response.text());
      return false;
    }

    console.log(`Push sent successfully to ${subscription.endpoint}`);
    return true;
  } catch (error) {
    console.error(`Error sending push to ${subscription.endpoint}:`, error);
    return false;
  }
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY");
    const vapidPublicKey = "BLOUvo2H-_X0DrSrjGCyybyry3EP5DyW-FcblyZpRQtDsAeYElQrsmszslUwpKeGalLzN4xvoBtANhlafaUoEVI";

    if (!vapidPrivateKey) {
      console.error("VAPID_PRIVATE_KEY not configured");
      return new Response(
        JSON.stringify({ error: "Push notifications not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { userId, allUsers, payload }: PushRequest = await req.json();

    console.log("Sending push notification:", { userId, allUsers, payload });

    // Get subscriptions
    let query = supabase.from("push_subscriptions").select("*");

    if (userId) {
      query = query.eq("user_id", userId);
    } else if (!allUsers) {
      return new Response(
        JSON.stringify({ error: "Must specify userId or allUsers" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: subscriptions, error } = await query;

    if (error) {
      console.error("Error fetching subscriptions:", error);
      throw error;
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log("No subscriptions found");
      return new Response(
        JSON.stringify({ success: true, sent: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Found ${subscriptions.length} subscriptions`);

    // Send push to all subscriptions
    let successCount = 0;
    const failedEndpoints: string[] = [];

    for (const subscription of subscriptions) {
      const success = await sendPushToEndpoint(
        subscription,
        payload,
        vapidPrivateKey,
        vapidPublicKey
      );

      if (success) {
        successCount++;
      } else {
        failedEndpoints.push(subscription.endpoint);
      }
    }

    // Clean up failed endpoints (likely expired subscriptions)
    if (failedEndpoints.length > 0) {
      await supabase
        .from("push_subscriptions")
        .delete()
        .in("endpoint", failedEndpoints);
      console.log(`Cleaned up ${failedEndpoints.length} expired subscriptions`);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        sent: successCount, 
        failed: failedEndpoints.length 
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error in send-push-notification:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
