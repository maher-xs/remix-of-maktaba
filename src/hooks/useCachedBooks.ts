import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useOnlineStatus } from './useOfflineStorage';
import { cacheData, getCachedData, STORE_NAMES, CACHE_DURATIONS } from './useDataCache';
import type { Book } from './useBooks';

// Cached version of useBooks
export const useCachedBooks = () => {
  const isOnline = useOnlineStatus();

  return useQuery({
    queryKey: ['books'],
    queryFn: async () => {
      // Try cache first if offline
      if (!isOnline) {
        const cached = await getCachedData<Book[]>(STORE_NAMES.books, 'all-books', true);
        if (cached) return cached;
        return [];
      }

      // Fetch from database
      const { data, error } = await supabase
        .from('books')
        .select(`
          *,
          category:categories(id, name, slug, icon, color)
        `)
        .order('created_at', { ascending: false });
      
      if (error) {
        // Try cache on error
        const cached = await getCachedData<Book[]>(STORE_NAMES.books, 'all-books', true);
        if (cached) return cached;
        throw error;
      }

      // Cache the result
      await cacheData(STORE_NAMES.books, 'all-books', data, CACHE_DURATIONS.books);
      return data as Book[];
    },
    staleTime: isOnline ? 5 * 60 * 1000 : Infinity, // 5 min when online, never stale when offline
    gcTime: 60 * 60 * 1000, // 1 hour
  });
};

// Cached version of useFeaturedBooks
export const useCachedFeaturedBooks = () => {
  const isOnline = useOnlineStatus();

  return useQuery({
    queryKey: ['featured-books'],
    queryFn: async () => {
      if (!isOnline) {
        const cached = await getCachedData<Book[]>(STORE_NAMES.featuredBooks, 'featured', true);
        if (cached) return cached;
        return [];
      }

      const { data, error } = await supabase
        .from('books')
        .select(`
          *,
          category:categories(id, name, slug, icon, color)
        `)
        .eq('is_featured', true)
        .order('download_count', { ascending: false })
        .limit(5);
      
      if (error) {
        const cached = await getCachedData<Book[]>(STORE_NAMES.featuredBooks, 'featured', true);
        if (cached) return cached;
        throw error;
      }

      await cacheData(STORE_NAMES.featuredBooks, 'featured', data, CACHE_DURATIONS.featuredBooks);
      return data as Book[];
    },
    staleTime: isOnline ? 1 * 60 * 1000 : Infinity, // 1 min when online
    gcTime: 60 * 60 * 1000,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
  });
};

// Cached version of useLatestBooks
export const useCachedLatestBooks = () => {
  const isOnline = useOnlineStatus();

  return useQuery({
    queryKey: ['latest-books'],
    queryFn: async () => {
      if (!isOnline) {
        const cached = await getCachedData<Book[]>(STORE_NAMES.latestBooks, 'latest', true);
        if (cached) return cached;
        return [];
      }

      const { data, error } = await supabase
        .from('books')
        .select(`
          *,
          category:categories(id, name, slug, icon, color)
        `)
        .order('created_at', { ascending: false })
        .limit(5);
      
      if (error) {
        const cached = await getCachedData<Book[]>(STORE_NAMES.latestBooks, 'latest', true);
        if (cached) return cached;
        throw error;
      }

      await cacheData(STORE_NAMES.latestBooks, 'latest', data, CACHE_DURATIONS.latestBooks);
      return data as Book[];
    },
    staleTime: isOnline ? 1 * 60 * 1000 : Infinity, // 1 min when online
    gcTime: 60 * 60 * 1000,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
  });
};

// Cached version of useBooksByCategory
export const useCachedBooksByCategory = (categoryId: string) => {
  const isOnline = useOnlineStatus();
  const cacheKey = `category-${categoryId}`;

  return useQuery({
    queryKey: ['books-by-category', categoryId],
    queryFn: async () => {
      if (!isOnline) {
        const cached = await getCachedData<Book[]>(STORE_NAMES.booksByCategory, cacheKey, true);
        if (cached) return cached;
        return [];
      }

      const { data, error } = await supabase
        .from('books')
        .select(`
          *,
          category:categories(id, name, slug, icon, color)
        `)
        .eq('category_id', categoryId)
        .order('download_count', { ascending: false });
      
      if (error) {
        const cached = await getCachedData<Book[]>(STORE_NAMES.booksByCategory, cacheKey, true);
        if (cached) return cached;
        throw error;
      }

      await cacheData(STORE_NAMES.booksByCategory, cacheKey, data, CACHE_DURATIONS.booksByCategory);
      return data as Book[];
    },
    enabled: !!categoryId,
    staleTime: isOnline ? 5 * 60 * 1000 : Infinity,
    gcTime: 60 * 60 * 1000,
  });
};

// Cached version of useBookById
export const useCachedBookById = (id: string) => {
  const isOnline = useOnlineStatus();
  const queryClient = useQueryClient();
  const cacheKey = `book-${id}`;

  const query = useQuery({
    queryKey: ['book', id],
    queryFn: async () => {
      if (!isOnline) {
        // Try to find in all-books cache
        const allBooks = await getCachedData<Book[]>(STORE_NAMES.books, 'all-books', true);
        if (allBooks) {
          const book = allBooks.find(b => b.id === id);
          if (book) return book;
        }
        return null;
      }

      const { data, error } = await supabase
        .from('books')
        .select(`
          *,
          category:categories(id, name, slug, icon, color, book_count)
        `)
        .eq('id', id)
        .single();
      
      if (error) throw error;

      // Fetch uploader info separately if uploaded_by exists
      let uploader = null;
      if (data.uploaded_by) {
        const { data: uploaderData } = await supabase
          .from('profiles')
          .select('id, username, full_name, avatar_url, is_public')
          .eq('id', data.uploaded_by)
          .maybeSingle();
        
        uploader = uploaderData;
      }

      return { 
        ...data, 
        uploader 
      } as Book & { 
        category: { id: string; name: string; slug: string; icon: string; color: string; book_count: number };
        uploader: { id: string; username: string | null; full_name: string | null; avatar_url: string | null; is_public: boolean | null } | null;
      };
    },
    enabled: !!id,
    staleTime: isOnline ? 5 * 60 * 1000 : Infinity,
    gcTime: 60 * 60 * 1000,
  });

  // Set up realtime subscription for this book (only when online)
  useEffect(() => {
    if (!id || !isOnline) return;

    const channel = supabase
      .channel(`book-${id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'books',
          filter: `id=eq.${id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['book', id] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, queryClient, isOnline]);

  return query;
};

// Hook for realtime updates on books list (only when online)
export const useCachedBooksRealtime = () => {
  const queryClient = useQueryClient();
  const isOnline = useOnlineStatus();

  useEffect(() => {
    if (!isOnline) return;

    const channel = supabase
      .channel('books-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'books',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['books'] });
          queryClient.invalidateQueries({ queryKey: ['latest-books'] });
          queryClient.invalidateQueries({ queryKey: ['featured-books'] });
          queryClient.invalidateQueries({ queryKey: ['books-by-category'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient, isOnline]);
};
