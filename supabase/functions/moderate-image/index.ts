import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ModerationResult {
  isSafe: boolean;
  category: string;
  confidence: number;
  message: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageUrl, imageBase64 } = await req.json();

    if (!imageUrl && !imageBase64) {
      return new Response(
        JSON.stringify({ error: 'يجب توفير رابط الصورة أو البيانات' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY is not configured');
      return new Response(
        JSON.stringify({ error: 'خطأ في إعدادات الخادم' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Prepare the image content for the AI
    let imageContent;
    if (imageBase64) {
      imageContent = {
        type: "image_url",
        image_url: {
          url: imageBase64.startsWith('data:') ? imageBase64 : `data:image/jpeg;base64,${imageBase64}`
        }
      };
    } else {
      imageContent = {
        type: "image_url",
        image_url: {
          url: imageUrl
        }
      };
    }

    // Use Lovable AI to analyze the image
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `You are a content moderation AI. Analyze images for inappropriate content.
            
Categories to detect:
- NSFW (nudity, sexual content, pornography)
- Violence (gore, weapons, blood)
- Hate (hate symbols, offensive gestures)
- Drugs (drug use, paraphernalia)
- Spam (promotional content, spam images)

Respond ONLY with a JSON object in this exact format:
{
  "isSafe": true/false,
  "category": "safe" or the detected category,
  "confidence": 0.0 to 1.0,
  "reason": "brief explanation in Arabic"
}

Be strict about NSFW content. If there's any doubt, mark as unsafe.`
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Analyze this image for inappropriate content. Is it safe for a public library platform?'
              },
              imageContent
            ]
          }
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'تم تجاوز حد الطلبات. حاول لاحقاً.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'الرصيد غير كافٍ.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      const errorText = await response.text();
      console.error('AI Gateway error:', response.status, errorText);
      
      // Return safe by default if AI fails (to not block users)
      return new Response(
        JSON.stringify({
          isSafe: true,
          category: 'unknown',
          confidence: 0,
          message: 'لم يتم التحقق من الصورة'
        } as ModerationResult),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';

    // Parse the AI response
    try {
      // Extract JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const result = JSON.parse(jsonMatch[0]);
      
      const moderationResult: ModerationResult = {
        isSafe: result.isSafe === true,
        category: result.category || 'unknown',
        confidence: typeof result.confidence === 'number' ? result.confidence : 0.5,
        message: result.isSafe 
          ? 'الصورة آمنة للنشر' 
          : `الصورة غير مناسبة: ${result.reason || 'محتوى غير لائق'}`
      };

      return new Response(
        JSON.stringify(moderationResult),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError, content);
      
      // Check for keywords in raw response as fallback
      const lowerContent = content.toLowerCase();
      const isUnsafe = lowerContent.includes('nsfw') || 
                       lowerContent.includes('unsafe') || 
                       lowerContent.includes('inappropriate') ||
                       lowerContent.includes('nudity') ||
                       lowerContent.includes('violence');

      return new Response(
        JSON.stringify({
          isSafe: !isUnsafe,
          category: isUnsafe ? 'potentially_unsafe' : 'safe',
          confidence: 0.6,
          message: isUnsafe ? 'قد تحتوي الصورة على محتوى غير مناسب' : 'الصورة آمنة للنشر'
        } as ModerationResult),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } catch (error) {
    console.error('Image moderation error:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'حدث خطأ أثناء فحص الصورة',
        isSafe: true, // Default to safe to not block users
        category: 'error',
        confidence: 0,
        message: 'لم يتم التحقق من الصورة'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
