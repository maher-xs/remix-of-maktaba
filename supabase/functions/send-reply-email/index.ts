import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ReplyEmailRequest {
  to: string;
  subject: string;
  recipientName: string;
  message: string;
  originalSubject?: string;
}

const generateEmailTemplate = (recipientName: string, message: string, originalSubject?: string) => `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#f8faf9;font-family:'Cairo',Tahoma,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8faf9;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="520" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 2px 16px rgba(61,107,90,0.08);">
          <tr>
            <td style="background:linear-gradient(145deg,#3d6b5a 0%,#2d5245 100%);padding:40px 32px;text-align:center;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <h1 style="color:#d4a574;font-size:36px;font-weight:800;margin:0;">مكتبة</h1>
                    <p style="color:rgba(255,255,255,0.85);font-size:14px;margin:8px 0 0 0;">بوابتك إلى عالم المعرفة العربية</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:40px 32px;">
              <h2 style="color:#2d3748;font-size:22px;font-weight:700;margin:0 0 12px 0;">مرحباً ${recipientName}</h2>
              ${originalSubject ? `<p style="color:#64748b;font-size:13px;margin:0 0 20px 0;padding:12px;background:#f1f5f9;border-radius:8px;">بخصوص: ${originalSubject}</p>` : ''}
              <div style="color:#374151;font-size:15px;line-height:1.9;margin:0 0 28px 0;white-space:pre-wrap;">
${message}
              </div>
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:24px;">
                <tr>
                  <td style="border-top:1px solid #e8f0ec;padding-top:20px;">
                    <p style="color:#64748b;font-size:13px;margin:0;">مع أطيب التحيات،</p>
                    <p style="color:#3d6b5a;font-size:15px;font-weight:600;margin:8px 0 0 0;">فريق مكتبة</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="background:#f8faf9;padding:24px 32px;border-top:1px solid #e8f0ec;">
              <p style="color:#94a3b8;font-size:12px;margin:0;text-align:center;">هذا الرد على رسالتك التي أرسلتها إلينا</p>
              <p style="color:#cbd5e1;font-size:11px;margin:12px 0 0 0;text-align:center;">© 2025 مكتبة</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { to, subject, recipientName, message, originalSubject }: ReplyEmailRequest = await req.json();

    console.log("Sending reply email to:", to);

    if (!to || !subject || !message) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing required fields: to, subject, message" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (!RESEND_API_KEY) {
      return new Response(
        JSON.stringify({ success: false, error: "RESEND_API_KEY is not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Fetch fromEmail from site_settings in database
    let fromEmail = "مكتبة <onboarding@resend.dev>";
    try {
      const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      const { data: settingsData } = await supabase
        .from("site_settings")
        .select("value")
        .eq("key", "general")
        .single();
      
      if (settingsData?.value?.fromEmail) {
        fromEmail = settingsData.value.fromEmail;
        console.log("Using fromEmail from settings:", fromEmail);
      }
    } catch (err) {
      console.log("Could not fetch fromEmail setting, using default:", err);
    }

    const html = generateEmailTemplate(recipientName || "عزيزي المستخدم", message, originalSubject);

    // Use Resend API directly via fetch
    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [to],
        subject,
        html,
      }),
    });

    const raw = await emailResponse.text();
    let responseData: any = null;
    try {
      responseData = raw ? JSON.parse(raw) : null;
    } catch {
      responseData = { message: raw };
    }

    if (!emailResponse.ok) {
      console.error("Resend API error:", responseData);

      const errorMessage =
        responseData?.message ||
        responseData?.error ||
        "Failed to send email";

      const needsDomainVerification =
        typeof errorMessage === "string" &&
        errorMessage.includes("verify a domain");

      // Return 200 so the client can show a friendly message without throwing a FunctionsHttpError.
      return new Response(
        JSON.stringify({
          success: false,
          error: errorMessage,
          status: emailResponse.status,
          needs_domain_verification: needsDomainVerification,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    console.log("Email sent successfully:", responseData);

    return new Response(JSON.stringify({ success: true, data: responseData }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Error sending reply email:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
