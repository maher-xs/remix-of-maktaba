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
