import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotificationRequest {
  type: 'verification' | 'warning' | 'ban' | 'unban';
  userEmail: string;
  userName: string;
  reason?: string;
  notes?: string;
  warningCount?: number;
}

const getEmailContent = (data: NotificationRequest) => {
  const { type, userName, reason, notes, warningCount } = data;
  
  const generateTemplate = (title: string, content: string) => `
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
                  <td align="center" style="padding-bottom:16px;">
                  </td>
                </tr>
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
              <h2 style="color:#2d3748;font-size:22px;font-weight:700;margin:0 0 12px 0;text-align:center;">${title}</h2>
              <p style="color:#64748b;font-size:15px;line-height:1.8;margin:0 0 28px 0;text-align:center;">
                ${content}
              </p>
            </td>
          </tr>
          <tr>
            <td style="background:#f8faf9;padding:24px 32px;border-top:1px solid #e8f0ec;">
              <p style="color:#94a3b8;font-size:12px;margin:0;text-align:center;">هذه رسالة تلقائية من فريق مكتبة</p>
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

  switch (type) {
    case 'verification':
      return {
        subject: 'تم توثيق حسابك في مكتبة',
        html: generateTemplate('تم توثيق حسابك', 
          `مرحبا ${userName}، تهانينا! تم توثيق حسابك بنجاح في مكتبة. يمكنك الآن الاستمتاع بجميع المميزات المتاحة للحسابات الموثقة.`
        ),
      };

    case 'warning': {
      let content = `مرحبا ${userName}، نود إعلامك بأنه تم إضافة تحذير على حسابك.<br/><br/>السبب: ${reason || 'مخالفة قواعد المجتمع'}`;
      
      if (notes) {
        content += `<br/><br/>ملاحظات إضافية: ${notes}`;
      }
      
      content += `<br/><br/>عدد التحذيرات: ${warningCount || 1} من 3`;
      content += `<br/><br/>نرجو الالتزام بقواعد المجتمع لتجنب المزيد من التحذيرات.`;
      
      return {
        subject: 'تحذير على حسابك في مكتبة',
        html: generateTemplate('تحذير على حسابك', content),
      };
    }

    case 'ban': {
      let content = `مرحبا ${userName}، نأسف لإعلامك بأنه تم حظر حسابك من استخدام المنصة.<br/><br/>السبب: ${reason || 'مخالفة قواعد المجتمع'}`;
      
      if (notes) {
        content += `<br/><br/>ملاحظات إضافية: ${notes}`;
      }
      
      content += `<br/><br/>إذا كنت تعتقد أن هذا الحظر غير عادل، يمكنك التواصل معنا عبر صفحة الاتصال.`;
      
      return {
        subject: 'تم حظر حسابك في مكتبة',
        html: generateTemplate('تم حظر حسابك', content),
      };
    }

    case 'unban':
      return {
        subject: 'تم إلغاء حظر حسابك في مكتبة',
        html: generateTemplate('تم إلغاء الحظر', 
          `مرحبا ${userName}، يسعدنا إعلامك بأنه تم إلغاء الحظر عن حسابك! يمكنك الآن العودة لاستخدام المنصة بشكل طبيعي. نرجو الالتزام بقواعد المجتمع لتجنب الحظر مستقبلا. مرحبا بعودتك!`
        ),
      };

    default:
      throw new Error('Invalid notification type');
  }
};

serve(async (req: Request): Promise<Response> => {
  console.log("send-user-notification function called");
  
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const data: NotificationRequest = await req.json();
    console.log("Notification request:", { type: data.type, userEmail: data.userEmail, userName: data.userName });

    if (!data.userEmail || !data.type || !data.userName) {
      console.error("Missing required fields");
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (!RESEND_API_KEY) {
      console.error("RESEND_API_KEY is not configured");
      return new Response(
        JSON.stringify({ error: "RESEND_API_KEY is not configured" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const emailContent = getEmailContent(data);
    console.log("Sending email with subject:", emailContent.subject);

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

    // Use Resend API directly via fetch
    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [data.userEmail],
        subject: emailContent.subject,
        html: emailContent.html,
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
      return new Response(
        JSON.stringify({ success: false, error: responseData?.message || "Failed to send email" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("Email sent successfully:", responseData);

    return new Response(JSON.stringify({ success: true, data: responseData }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-user-notification function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
