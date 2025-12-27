import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/xml; charset=utf-8',
}

// Base URL for the site
const SITE_URL = 'https://maktaba.cc'

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log('Generating dynamic sitemap...')

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Fetch categories
    console.log('Fetching categories...')
    const { data: categories, error: categoriesError } = await supabase
      .from('categories')
      .select('slug, name, updated_at')
      .order('book_count', { ascending: false })

    if (categoriesError) {
      console.error('Error fetching categories:', categoriesError)
      throw categoriesError
    }

    // Fetch books
    console.log('Fetching books...')
    const { data: books, error: booksError } = await supabase
      .from('books')
      .select('id, title, author, updated_at')
      .order('updated_at', { ascending: false })
      .limit(1000)

    if (booksError) {
      console.error('Error fetching books:', booksError)
      throw booksError
    }

    console.log(`Found ${categories?.length || 0} categories and ${books?.length || 0} books`)

    const today = new Date().toISOString().split('T')[0]

    // Static pages with their priorities and titles
    const staticPages = [
      { url: '/', priority: '1.0', changefreq: 'daily', title: 'الرئيسية', description: 'مكتبة إلكترونية عربية مجانية' },
      { url: '/categories', priority: '0.9', changefreq: 'daily', title: 'التصنيفات', description: 'تصفح جميع تصنيفات الكتب' },
      { url: '/search', priority: '0.8', changefreq: 'weekly', title: 'البحث', description: 'ابحث عن الكتب والمؤلفين' },
      { url: '/about', priority: '0.6', changefreq: 'monthly', title: 'من نحن', description: 'تعرف على مكتبة المكتبة' },
      { url: '/contact', priority: '0.5', changefreq: 'monthly', title: 'اتصل بنا', description: 'تواصل معنا' },
      { url: '/privacy', priority: '0.3', changefreq: 'yearly', title: 'سياسة الخصوصية', description: 'سياسة الخصوصية الخاصة بنا' },
      { url: '/terms', priority: '0.3', changefreq: 'yearly', title: 'شروط الخدمة', description: 'شروط استخدام الموقع' },
      { url: '/sitemap', priority: '0.4', changefreq: 'weekly', title: 'خريطة الموقع', description: 'جميع صفحات الموقع' },
      { url: '/install', priority: '0.5', changefreq: 'monthly', title: 'تثبيت التطبيق', description: 'ثبت التطبيق على جهازك' },
      { url: '/auth', priority: '0.4', changefreq: 'monthly', title: 'تسجيل الدخول', description: 'سجّل دخولك أو أنشئ حساب' },
    ]

    // Build XML sitemap with extended namespace for custom tags
    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml"
        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9
        http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">
`

    // Add static pages
    for (const page of staticPages) {
      xml += `  <url>
    <loc>${SITE_URL}${page.url}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
    <!-- ${page.title} - ${page.description} -->
  </url>
`
    }

    // Add category pages
    if (categories && categories.length > 0) {
      for (const category of categories) {
        const lastmod = category.updated_at 
          ? new Date(category.updated_at).toISOString().split('T')[0]
          : today
        
        xml += `  <url>
    <loc>${SITE_URL}/categories/${category.slug}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
    <!-- تصنيف: ${category.name} -->
  </url>
`
      }
    }

    // Add book pages
    if (books && books.length > 0) {
      for (const book of books) {
        const lastmod = book.updated_at 
          ? new Date(book.updated_at).toISOString().split('T')[0]
          : today
        
        xml += `  <url>
    <loc>${SITE_URL}/book/${book.id}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
    <!-- كتاب: ${book.title} - المؤلف: ${book.author} -->
  </url>
`
      }
    }

    xml += `</urlset>`

    console.log('Sitemap generated successfully')

    return new Response(xml, {
      headers: corsHeaders,
      status: 200,
    })

  } catch (error) {
    console.error('Error generating sitemap:', error)
    
    // Return a basic sitemap on error
    const fallbackXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${SITE_URL}/</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <priority>1.0</priority>
  </url>
</urlset>`

    return new Response(fallbackXml, {
      headers: corsHeaders,
      status: 200,
    })
  }
})
