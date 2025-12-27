import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { cacheData, getCachedData, STORE_NAMES, CACHE_DURATIONS } from './useDataCache';

const PREFETCH_KEY = 'maktaba-prefetch-completed';
const PREFETCH_VERSION = '1'; // Increment to force re-prefetch

interface PrefetchStatus {
  version: string;
  timestamp: number;
  success: boolean;
}

// Check if prefetch has already been done today
function shouldPrefetch(): boolean {
  try {
    const stored = localStorage.getItem(PREFETCH_KEY);
    if (!stored) return true;
    
    const status: PrefetchStatus = JSON.parse(stored);
    
    // Re-prefetch if version changed
    if (status.version !== PREFETCH_VERSION) return true;
    
    // Re-prefetch if last prefetch was more than 24 hours ago
    const oneDayMs = 24 * 60 * 60 * 1000;
    if (Date.now() - status.timestamp > oneDayMs) return true;
    
    return !status.success;
  } catch {
    return true;
  }
}

function markPrefetchComplete(success: boolean): void {
  try {
    const status: PrefetchStatus = {
      version: PREFETCH_VERSION,
      timestamp: Date.now(),
      success,
    };
    localStorage.setItem(PREFETCH_KEY, JSON.stringify(status));
  } catch {
    // Ignore localStorage errors
  }
}

async function prefetchPopularBooks(): Promise<void> {
  console.log('🔄 بدء تحميل الكتب الشائعة مسبقاً...');
  
  try {
    // Fetch featured books (most important)
    const { data: featuredBooks } = await supabase
      .from('books')
      .select('*')
      .eq('is_featured', true)
      .order('view_count', { ascending: false })
      .limit(12);
    
    if (featuredBooks?.length) {
      await cacheData(
        STORE_NAMES.featuredBooks,
        'featured',
        featuredBooks,
        CACHE_DURATIONS.featuredBooks
      );
      console.log(`✅ تم حفظ ${featuredBooks.length} كتاب مميز`);
    }
    
    // Fetch latest books
    const { data: latestBooks } = await supabase
      .from('books')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(12);
    
    if (latestBooks?.length) {
      await cacheData(
        STORE_NAMES.latestBooks,
        'latest',
        latestBooks,
        CACHE_DURATIONS.latestBooks
      );
      console.log(`✅ تم حفظ ${latestBooks.length} كتاب حديث`);
    }
    
    // Fetch most popular books (by view count)
    const { data: popularBooks } = await supabase
      .from('books')
      .select('*')
      .order('view_count', { ascending: false })
      .limit(20);
    
    if (popularBooks?.length) {
      await cacheData(
        STORE_NAMES.books,
        'popular-books',
        popularBooks,
        CACHE_DURATIONS.books
      );
      console.log(`✅ تم حفظ ${popularBooks.length} كتاب شائع`);
    }
    
    // Fetch most downloaded books
    const { data: downloadedBooks } = await supabase
      .from('books')
      .select('*')
      .order('download_count', { ascending: false })
      .limit(10);
    
    if (downloadedBooks?.length) {
      await cacheData(
        STORE_NAMES.books,
        'most-downloaded',
        downloadedBooks,
        CACHE_DURATIONS.books
      );
      console.log(`✅ تم حفظ ${downloadedBooks.length} كتاب الأكثر تحميلاً`);
    }
    
    // Fetch all categories
    const { data: categories } = await supabase
      .from('categories')
      .select('*')
      .order('book_count', { ascending: false });
    
    if (categories?.length) {
      await cacheData(
        STORE_NAMES.categories,
        'all-categories',
        categories,
        CACHE_DURATIONS.categories
      );
      console.log(`✅ تم حفظ ${categories.length} تصنيف`);
    }
    
    // Fetch books for top 3 categories
    if (categories?.length) {
      const topCategories = categories.slice(0, 3);
      for (const category of topCategories) {
        const { data: categoryBooks } = await supabase
          .from('books')
          .select('*')
          .eq('category_id', category.id)
          .order('view_count', { ascending: false })
          .limit(8);
        
        if (categoryBooks?.length) {
          await cacheData(
            STORE_NAMES.booksByCategory,
            `category-${category.slug}`,
            categoryBooks,
            CACHE_DURATIONS.booksByCategory
          );
        }
      }
      console.log(`✅ تم حفظ كتب أفضل ${topCategories.length} تصنيفات`);
    }
    
    markPrefetchComplete(true);
    console.log('🎉 اكتمل التحميل المسبق بنجاح!');
    
  } catch (error) {
    console.warn('⚠️ فشل التحميل المسبق:', error);
    markPrefetchComplete(false);
  }
}

export function usePopularBooksPrefetch(): void {
  const prefetchStarted = useRef(false);
  
  useEffect(() => {
    // Only run once and only when online
    if (prefetchStarted.current || !navigator.onLine) return;
    
    // Check if we should prefetch
    if (!shouldPrefetch()) {
      console.log('📦 البيانات محملة مسبقاً بالفعل');
      return;
    }
    
    prefetchStarted.current = true;
    
    // Use requestIdleCallback for non-blocking prefetch
    if ('requestIdleCallback' in window) {
      window.requestIdleCallback(() => {
        prefetchPopularBooks();
      }, { timeout: 5000 });
    } else {
      // Fallback: delay prefetch to not block initial render
      setTimeout(() => {
        prefetchPopularBooks();
      }, 3000);
    }
  }, []);
}

// Manual trigger for prefetch (useful for settings page)
export async function triggerManualPrefetch(): Promise<{
  success: boolean;
  message: string;
}> {
  if (!navigator.onLine) {
    return { success: false, message: 'لا يوجد اتصال بالإنترنت' };
  }
  
  try {
    // Clear the prefetch flag to force re-prefetch
    localStorage.removeItem(PREFETCH_KEY);
    await prefetchPopularBooks();
    return { success: true, message: 'تم تحميل البيانات بنجاح!' };
  } catch (error) {
    return { success: false, message: 'حدث خطأ أثناء التحميل' };
  }
}

// Get prefetch status
export function getPrefetchStatus(): {
  isPrefetched: boolean;
  lastPrefetch: Date | null;
} {
  try {
    const stored = localStorage.getItem(PREFETCH_KEY);
    if (!stored) return { isPrefetched: false, lastPrefetch: null };
    
    const status: PrefetchStatus = JSON.parse(stored);
    return {
      isPrefetched: status.success,
      lastPrefetch: new Date(status.timestamp),
    };
  } catch {
    return { isPrefetched: false, lastPrefetch: null };
  }
}
