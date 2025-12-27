# Edge Functions - دليل التثبيت الكامل

## هيكل المجلدات المطلوب

```
supabase/
├── config.toml
└── functions/
    ├── get-client-ip/
    │   └── index.ts
    ├── check-ip-blocked/
    │   └── index.ts
    ├── extract-pdf-metadata/
    │   └── index.ts
    ├── admin-update-user/
    │   └── index.ts
    ├── admin-get-blocked-ips/
    │   └── index.ts
    ├── admin-unblock-ip/
    │   └── index.ts
    └── get-user-insights/
        └── index.ts
```

---

## 1. ملف config.toml

**المسار:** `supabase/config.toml`

```toml
project_id = "YOUR_PROJECT_ID"

[functions.get-client-ip]
verify_jwt = false

[functions.check-ip-blocked]
verify_jwt = false

[functions.extract-pdf-metadata]
verify_jwt = false
```

**ملاحظة:** استبدل `YOUR_PROJECT_ID` بـ Project ID الخاص بك من Supabase Dashboard.

---

## 2. get-client-ip

**المسار:** `supabase/functions/get-client-ip/index.ts`

```typescript
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
```

---

## 3. check-ip-blocked

**المسار:** `supabase/functions/check-ip-blocked/index.ts`

```typescript
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
```

---

## 4. extract-pdf-metadata

**المسار:** `supabase/functions/extract-pdf-metadata/index.ts`

```typescript
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
    console.log('Received PDF metadata extraction request');

    let bytes: Uint8Array;
    let filename = 'unknown.pdf';

    // Check content type to determine how to parse the request
    const contentType = req.headers.get('content-type') || '';
    
    if (contentType.includes('application/json')) {
      // Handle JSON request (base64 encoded file)
      const { file, filename: fname } = await req.json();
      
      if (!file) {
        console.error('No file provided in JSON body');
        return new Response(
          JSON.stringify({ error: 'No file provided' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      // Decode base64 to Uint8Array
      const binaryString = atob(file);
      bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      if (fname) filename = fname;
      console.log('File received from JSON:', filename, 'Size:', bytes.length);
      
    } else {
      // Handle FormData request (legacy support)
      const formData = await req.formData();
      const file = formData.get('file') as File;

      if (!file) {
        console.error('No file provided in FormData');
        return new Response(
          JSON.stringify({ error: 'No file provided' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      filename = file.name;
      const arrayBuffer = await file.arrayBuffer();
      bytes = new Uint8Array(arrayBuffer);
      console.log('File received from FormData:', filename, 'Size:', bytes.length);
    }
    
    // Convert first part of PDF to string to find metadata
    const decoder = new TextDecoder('latin1');
    const pdfText = decoder.decode(bytes.slice(0, Math.min(bytes.length, 50000)));
    
    let title = '';
    let author = '';
    let year = '';
    let pages = 0;
    let publisher = '';
    
    // Extract Title from PDF metadata
    const titleMatch = pdfText.match(/\/Title\s*\(([^)]+)\)/i) || 
                       pdfText.match(/\/Title\s*<([^>]+)>/i);
    if (titleMatch) {
      title = decodeURIComponent(titleMatch[1].replace(/\\x/g, '%').replace(/\\/g, ''));
      // Clean up hex encoded strings
      if (titleMatch[0].includes('<')) {
        title = hexToString(titleMatch[1]);
      }
    }
    
    // Extract Author from PDF metadata
    const authorMatch = pdfText.match(/\/Author\s*\(([^)]+)\)/i) ||
                        pdfText.match(/\/Author\s*<([^>]+)>/i);
    if (authorMatch) {
      author = decodeURIComponent(authorMatch[1].replace(/\\x/g, '%').replace(/\\/g, ''));
      if (authorMatch[0].includes('<')) {
        author = hexToString(authorMatch[1]);
      }
    }
    
    // Extract Creation Date for year
    const dateMatch = pdfText.match(/\/CreationDate\s*\(D:(\d{4})/i);
    if (dateMatch) {
      year = dateMatch[1];
    }
    
    // Try to find year in other metadata
    if (!year) {
      const yearMatch = pdfText.match(/\b(19[5-9]\d|20[0-2]\d)\b/);
      if (yearMatch) {
        year = yearMatch[1];
      }
    }
    
    // Count pages (approximate)
    const pageMatches = pdfText.match(/\/Type\s*\/Page[^s]/g);
    if (pageMatches) {
      pages = pageMatches.length;
    }
    
    // Try to get page count from metadata
    const pageCountMatch = pdfText.match(/\/Count\s+(\d+)/);
    if (pageCountMatch) {
      pages = parseInt(pageCountMatch[1], 10);
    }
    
    // Extract Producer/Creator as potential publisher
    const producerMatch = pdfText.match(/\/Producer\s*\(([^)]+)\)/i);
    if (producerMatch) {
      publisher = producerMatch[1].replace(/\\/g, '');
    }

    const metadata = {
      title: cleanString(title),
      author: cleanString(author),
      year: year,
      pages: pages,
      publisher: cleanString(publisher),
    };

    console.log('Extracted metadata:', metadata);

    return new Response(
      JSON.stringify({ success: true, metadata }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error extracting PDF metadata:', errorMessage);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to extract PDF metadata', 
        details: errorMessage 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Helper function to convert hex string to regular string
function hexToString(hex: string): string {
  try {
    let str = '';
    for (let i = 0; i < hex.length; i += 2) {
      str += String.fromCharCode(parseInt(hex.substr(i, 2), 16));
    }
    return str;
  } catch {
    return hex;
  }
}

// Clean and normalize strings
function cleanString(str: string): string {
  if (!str) return '';
  return str
    .replace(/[\x00-\x1F\x7F]/g, '') // Remove control characters
    .replace(/^\uFEFF/, '') // Remove BOM
    .trim();
}
```

---

## 5. admin-update-user

**المسار:** `supabase/functions/admin-update-user/index.ts`

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    // Create admin client
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    
    // Get user token to verify admin status
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user: requestingUser }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !requestingUser) {
      throw new Error("Unauthorized");
    }

    // Check if requesting user is admin
    const { data: roleData } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", requestingUser.id)
      .eq("role", "admin")
      .single();

    if (!roleData) {
      throw new Error("Access denied: Admin only");
    }

    const { userId, email } = await req.json();

    if (!userId) {
      throw new Error("User ID is required");
    }

    // Update user email using admin API
    const { data, error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      email: email,
      email_confirm: true, // Auto-confirm the new email
    });

    if (error) {
      throw error;
    }

    return new Response(
      JSON.stringify({ success: true, user: data.user }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});
```

---

## 6. admin-get-blocked-ips

**المسار:** `supabase/functions/admin-get-blocked-ips/index.ts`

```typescript
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
    // Get the authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Check if user is admin
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    // Check admin role
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (!roleData) {
      return new Response(
        JSON.stringify({ error: 'Access denied' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
      );
    }

    // Use service role to get blocked IPs
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const adminSupabase = createClient(supabaseUrl, serviceRoleKey);

    const { data, error } = await adminSupabase
      .from('blocked_ips')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching blocked IPs:', error);
      return new Response(
        JSON.stringify({ error: error.message }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    return new Response(
      JSON.stringify(data),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    console.error('Error in admin-get-blocked-ips:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
```

---

## 7. admin-unblock-ip

**المسار:** `supabase/functions/admin-unblock-ip/index.ts`

```typescript
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
        JSON.stringify({ error: 'No IP address provided' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Get the authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Check if user is admin
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    // Check admin role
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (!roleData) {
      return new Response(
        JSON.stringify({ error: 'Access denied' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
      );
    }

    // Use service role to delete blocked IP
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const adminSupabase = createClient(supabaseUrl, serviceRoleKey);

    const { error } = await adminSupabase
      .from('blocked_ips')
      .delete()
      .eq('ip_address', ip_address);

    if (error) {
      console.error('Error unblocking IP:', error);
      return new Response(
        JSON.stringify({ error: error.message }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    console.log('IP unblocked successfully:', ip_address);

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    console.error('Error in admin-unblock-ip:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
```

---

## 8. get-user-insights

**المسار:** `supabase/functions/get-user-insights/index.ts`

```typescript
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
    // Get the authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Get the user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error('User error:', userError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Getting insights for user:', user.id);

    // Get reading stats
    const { data: stats, error: statsError } = await supabase
      .rpc('get_reading_stats', { p_user_id: user.id });

    if (statsError) {
      console.error('Stats error:', statsError);
      throw statsError;
    }

    // Get reading activity by day (last 30 days)
    const { data: activity, error: activityError } = await supabase
      .from('reading_progress')
      .select('last_read_at, current_page')
      .eq('user_id', user.id)
      .gte('last_read_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
      .order('last_read_at', { ascending: true });

    if (activityError) {
      console.error('Activity error:', activityError);
    }

    // Get top categories
    const { data: topCategories, error: categoriesError } = await supabase
      .from('reading_progress')
      .select(`
        book_id,
        books!inner (
          category_id,
          categories!inner (
            name,
            color,
            icon
          )
        )
      `)
      .eq('user_id', user.id);

    if (categoriesError) {
      console.error('Categories error:', categoriesError);
    }

    // Process categories
    const categoryCount: Record<string, { name: string; count: number; color: string; icon: string }> = {};
    topCategories?.forEach((item: any) => {
      if (item.books?.categories) {
        const cat = item.books.categories;
        if (!categoryCount[cat.name]) {
          categoryCount[cat.name] = { name: cat.name, count: 0, color: cat.color, icon: cat.icon };
        }
        categoryCount[cat.name].count++;
      }
    });

    const sortedCategories = Object.values(categoryCount)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Get annotations summary
    const { data: annotationsSummary, error: annotationsError } = await supabase
      .from('book_annotations')
      .select('annotation_type')
      .eq('user_id', user.id);

    if (annotationsError) {
      console.error('Annotations error:', annotationsError);
    }

    const annotationCounts = {
      highlight: 0,
      note: 0,
      bookmark: 0
    };
    annotationsSummary?.forEach((a: any) => {
      if (annotationCounts[a.annotation_type as keyof typeof annotationCounts] !== undefined) {
        annotationCounts[a.annotation_type as keyof typeof annotationCounts]++;
      }
    });

    // Build activity chart data
    const activityChart: { date: string; pages: number }[] = [];
    const last30Days = new Map<string, number>();
    
    for (let i = 29; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      last30Days.set(dateStr, 0);
    }

    activity?.forEach((item: any) => {
      const dateStr = new Date(item.last_read_at).toISOString().split('T')[0];
      if (last30Days.has(dateStr)) {
        last30Days.set(dateStr, (last30Days.get(dateStr) || 0) + (item.current_page || 1));
      }
    });

    last30Days.forEach((pages, date) => {
      activityChart.push({ date, pages });
    });

    const response = {
      stats: stats?.[0] || null,
      topCategories: sortedCategories,
      annotationCounts,
      activityChart,
      generatedAt: new Date().toISOString()
    };

    console.log('Insights generated successfully');

    return new Response(
      JSON.stringify(response),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
```

---

## خطوات نشر Edge Functions

### 1. تثبيت Supabase CLI

```bash
npm install -g supabase
```

### 2. تسجيل الدخول

```bash
supabase login
```

### 3. ربط المشروع

```bash
supabase link --project-ref YOUR_PROJECT_ID
```

### 4. نشر جميع الـ Functions

```bash
supabase functions deploy get-client-ip
supabase functions deploy check-ip-blocked
supabase functions deploy extract-pdf-metadata
supabase functions deploy admin-update-user
supabase functions deploy admin-get-blocked-ips
supabase functions deploy admin-unblock-ip
supabase functions deploy get-user-insights
```

### أو نشر الكل دفعة واحدة:

```bash
supabase functions deploy
```

---

## ملاحظات مهمة

1. **Functions العامة (لا تحتاج مصادقة):**
   - `get-client-ip`
   - `check-ip-blocked`
   - `extract-pdf-metadata`

2. **Functions خاصة (تحتاج مصادقة):**
   - `admin-update-user` (Admin فقط)
   - `admin-get-blocked-ips` (Admin فقط)
   - `admin-unblock-ip` (Admin فقط)
   - `get-user-insights` (مستخدم مسجل)

3. **المتغيرات البيئية المطلوبة:**
   - `SUPABASE_URL` (تلقائي)
   - `SUPABASE_ANON_KEY` (تلقائي)
   - `SUPABASE_SERVICE_ROLE_KEY` (تلقائي)
