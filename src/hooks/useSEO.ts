import { useEffect } from 'react';

interface SEOOptions {
  title: string;
  description: string;
  keywords?: string;
  image?: string;
  url?: string;
  type?: 'website' | 'book' | 'article' | 'profile';
  author?: string;
  publishedTime?: string;
  modifiedTime?: string;
  bookData?: {
    author: string;
    isbn?: string;
    releaseDate?: string;
    pages?: number;
  };
  noindex?: boolean;
  twitterHandle?: string;
}

const BASE_URL = 'https://maktaba.cc';
const DEFAULT_IMAGE = `${BASE_URL}/icons/icon-512x512.png`;
const SITE_NAME = 'مكتبة';
const SITE_DESCRIPTION = 'مكتبتك الرقمية العربية المجانية - من غرفة صغيرة للعالم العربي كله';
const TWITTER_HANDLE = '@maktaba_cc';

export const useSEO = (options: SEOOptions) => {
  useEffect(() => {
    const {
      title,
      description,
      keywords,
      image = DEFAULT_IMAGE,
      url = window.location.pathname ? `${BASE_URL}${window.location.pathname}${window.location.search}` : BASE_URL,
      type = 'website',
      author,
      publishedTime,
      modifiedTime,
      bookData,
      noindex = false,
      twitterHandle = TWITTER_HANDLE,
    } = options;

    // Full title with site name
    const fullTitle = `${title} | ${SITE_NAME}`;
    
    // Truncate description to 160 chars for SEO
    const truncatedDescription = description.length > 160 
      ? description.substring(0, 157) + '...' 
      : description;

    // Social description (can be longer - 200 chars for Facebook)
    const socialDescription = description.length > 200 
      ? description.substring(0, 197) + '...' 
      : description;

    // Update document title
    document.title = fullTitle;

    // Helper function to update or create meta tag
    const updateMetaTag = (selector: string, content: string, attribute = 'content') => {
      let meta = document.querySelector(selector);
      if (meta) {
        meta.setAttribute(attribute, content);
      } else {
        meta = document.createElement('meta');
        const match = selector.match(/\[([^=]+)="([^"]+)"\]/);
        if (match) {
          const [, attrType, attrValue] = match;
          meta.setAttribute(attrType, attrValue);
        }
        meta.setAttribute(attribute, content);
        document.head.appendChild(meta);
      }
      return meta;
    };

    // Update basic meta tags
    updateMetaTag('meta[name="description"]', truncatedDescription);
    if (keywords) {
      updateMetaTag('meta[name="keywords"]', keywords);
    }
    updateMetaTag('meta[name="author"]', author || SITE_NAME);
    
    // Robots
    updateMetaTag('meta[name="robots"]', noindex ? 'noindex, nofollow' : 'index, follow, max-image-preview:large');
    updateMetaTag('meta[name="googlebot"]', noindex ? 'noindex, nofollow' : 'index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1');

    // ============================================
    // Open Graph tags (Facebook, LinkedIn, etc.)
    // ============================================
    updateMetaTag('meta[property="og:title"]', fullTitle);
    updateMetaTag('meta[property="og:description"]', socialDescription);
    updateMetaTag('meta[property="og:image"]', image);
    updateMetaTag('meta[property="og:image:width"]', '1200');
    updateMetaTag('meta[property="og:image:height"]', '630');
    updateMetaTag('meta[property="og:image:alt"]', title);
    updateMetaTag('meta[property="og:url"]', url);
    updateMetaTag('meta[property="og:type"]', type === 'book' ? 'book' : type);
    updateMetaTag('meta[property="og:site_name"]', SITE_NAME);
    updateMetaTag('meta[property="og:locale"]', 'ar_AR');
    updateMetaTag('meta[property="og:locale:alternate"]', 'ar_SA');

    // Book-specific Open Graph
    if (type === 'book' && bookData) {
      updateMetaTag('meta[property="book:author"]', bookData.author);
      if (bookData.isbn) {
        updateMetaTag('meta[property="book:isbn"]', bookData.isbn);
      }
      if (bookData.releaseDate) {
        updateMetaTag('meta[property="book:release_date"]', bookData.releaseDate);
      }
    }

    // ============================================
    // Twitter Card tags
    // ============================================
    updateMetaTag('meta[name="twitter:card"]', 'summary_large_image');
    updateMetaTag('meta[name="twitter:site"]', twitterHandle);
    updateMetaTag('meta[name="twitter:creator"]', twitterHandle);
    updateMetaTag('meta[name="twitter:title"]', fullTitle);
    updateMetaTag('meta[name="twitter:description"]', socialDescription);
    updateMetaTag('meta[name="twitter:image"]', image);
    updateMetaTag('meta[name="twitter:image:alt"]', title);
    updateMetaTag('meta[name="twitter:url"]', url);

    // ============================================
    // Additional Social Meta Tags
    // ============================================
    // Pinterest
    updateMetaTag('meta[name="pinterest:description"]', socialDescription);
    
    // WhatsApp / Telegram preview
    updateMetaTag('meta[itemprop="name"]', fullTitle);
    updateMetaTag('meta[itemprop="description"]', socialDescription);
    updateMetaTag('meta[itemprop="image"]', image);

    // ============================================
    // Canonical URL
    // ============================================
    let canonical = document.querySelector('link[rel="canonical"]');
    if (canonical) {
      canonical.setAttribute('href', url);
    } else {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      canonical.setAttribute('href', url);
      document.head.appendChild(canonical);
    }

    // ============================================
    // Book-specific structured data (legacy - now using BookJsonLd component)
    // ============================================
    if (type === 'book' && bookData) {
      // Remove existing book schema (handled by BookJsonLd component now)
      const existingSchema = document.querySelector('script[data-schema="book"]');
      if (existingSchema) {
        existingSchema.remove();
      }
    }

    // Article/Time metadata
    if (publishedTime) {
      updateMetaTag('meta[property="article:published_time"]', publishedTime);
    }
    if (modifiedTime) {
      updateMetaTag('meta[property="article:modified_time"]', modifiedTime);
    }

    // Cleanup function
    return () => {
      // Remove dynamic book schema when unmounting
      const bookSchema = document.querySelector('script[data-schema="book"]');
      if (bookSchema) {
        bookSchema.remove();
      }
    };
  }, [options.title, options.description, options.image, options.url, options.type]);
};

// Generate keywords for books
export const generateBookKeywords = (title: string, author: string, category?: string): string => {
  const baseKeywords = [
    'تحميل كتاب',
    'قراءة كتاب',
    'كتاب PDF',
    'مكتبة عربية',
    'كتب مجانية',
    'مكتبتي',
  ];
  
  const bookKeywords = [
    `كتاب ${title}`,
    `تحميل ${title}`,
    `${title} PDF`,
    `كتب ${author}`,
    `مؤلفات ${author}`,
  ];
  
  if (category) {
    bookKeywords.push(`كتب ${category}`, `${category} عربي`);
  }
  
  return [...bookKeywords, ...baseKeywords].join('، ');
};

// Generate keywords for categories
export const generateCategoryKeywords = (categoryName: string): string => {
  return [
    `كتب ${categoryName}`,
    `${categoryName} PDF`,
    `تحميل كتب ${categoryName}`,
    `أفضل كتب ${categoryName}`,
    `كتب ${categoryName} مجانية`,
    `قراءة ${categoryName}`,
    'مكتبة عربية',
    'مكتبتي',
    'كتب مجانية',
  ].join('، ');
};

// Generate sharing URLs
export const getShareUrls = (url: string, title: string, description?: string) => {
  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);
  const encodedDesc = encodeURIComponent(description || '');

  return {
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
    twitter: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
    whatsapp: `https://wa.me/?text=${encodedTitle}%20${encodedUrl}`,
    telegram: `https://t.me/share/url?url=${encodedUrl}&text=${encodedTitle}`,
    pinterest: `https://pinterest.com/pin/create/button/?url=${encodedUrl}&description=${encodedDesc}`,
    email: `mailto:?subject=${encodedTitle}&body=${encodedDesc}%0A%0A${encodedUrl}`,
  };
};
