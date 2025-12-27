import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOnlineStatus } from './useOfflineStorage';
import { cacheData, getCachedData, STORE_NAMES, CACHE_DURATIONS } from './useDataCache';
import type { Category } from './useCategories';

// Cached version of useCategories
export const useCachedCategories = () => {
  const isOnline = useOnlineStatus();

  return useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      // Try cache first if offline
      if (!isOnline) {
        const cached = await getCachedData<Category[]>(STORE_NAMES.categories, 'all-categories', true);
        if (cached) return cached;
        return [];
      }

      // Fetch from database
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('book_count', { ascending: false });
      
      if (error) {
        // Try cache on error
        const cached = await getCachedData<Category[]>(STORE_NAMES.categories, 'all-categories', true);
        if (cached) return cached;
        throw error;
      }

      // Cache the result
      await cacheData(STORE_NAMES.categories, 'all-categories', data, CACHE_DURATIONS.categories);
      return data as Category[];
    },
    staleTime: isOnline ? 5 * 60 * 1000 : Infinity, // 5 min when online, never stale when offline
    gcTime: 60 * 60 * 1000, // 1 hour
  });
};

// Cached version of useCategoryBySlug
export const useCachedCategoryBySlug = (slug: string) => {
  const isOnline = useOnlineStatus();

  return useQuery({
    queryKey: ['category', slug],
    queryFn: async () => {
      // Try to find in all-categories cache first
      const allCategories = await getCachedData<Category[]>(STORE_NAMES.categories, 'all-categories', true);
      if (allCategories) {
        const category = allCategories.find(c => c.slug === slug);
        if (category) return category;
      }

      // If offline and not in cache, return null
      if (!isOnline) return null;

      // Fetch from database
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('slug', slug)
        .single();
      
      if (error) throw error;
      return data as Category;
    },
    enabled: !!slug,
    staleTime: isOnline ? 5 * 60 * 1000 : Infinity,
    gcTime: 60 * 60 * 1000,
  });
};
