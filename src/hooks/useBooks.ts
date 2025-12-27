import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface Book {
  id: string;
  title: string;
  author: string;
  description: string | null;
  cover_url: string | null;
  category_id: string | null;
  pages: number | null;
  language: string;
  publish_year: number | null;
  publisher: string | null;
  isbn: string | null;
  download_count: number;
  view_count: number;
  file_url: string | null;
  file_size: string | null;
  is_featured: boolean;
  created_at: string;
  updated_at: string;
  uploaded_by: string | null;
  category?: {
    id: string;
    name: string;
    slug: string;
    icon: string;
    color: string;
  };
  uploader?: {
    id: string;
    username: string | null;
    full_name: string | null;
    avatar_url: string | null;
    is_public: boolean | null;
  };
}

export const useBooks = () => {
  return useQuery({
    queryKey: ['books'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('books')
        .select(`
          *,
          category:categories(id, name, slug, icon, color)
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Book[];
    },
  });
};

export const useFeaturedBooks = () => {
  return useQuery({
    queryKey: ['featured-books'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('books')
        .select(`
          *,
          category:categories(id, name, slug, icon, color)
        `)
        .eq('is_featured', true)
        .order('download_count', { ascending: false })
        .limit(5);
      
      if (error) throw error;
      return data as Book[];
    },
  });
};

export const useLatestBooks = () => {
  return useQuery({
    queryKey: ['latest-books'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('books')
        .select(`
          *,
          category:categories(id, name, slug, icon, color)
        `)
        .order('created_at', { ascending: false })
        .limit(5);
      
      if (error) throw error;
      return data as Book[];
    },
  });
};

export const useBooksByCategory = (categoryId: string) => {
  return useQuery({
    queryKey: ['books-by-category', categoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('books')
        .select(`
          *,
          category:categories(id, name, slug, icon, color)
        `)
        .eq('category_id', categoryId)
        .order('download_count', { ascending: false });
      
      if (error) throw error;
      return data as Book[];
    },
    enabled: !!categoryId,
  });
};

export const useBookById = (id: string) => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['book', id],
    queryFn: async () => {
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
  });

  // Set up realtime subscription for this book
  useEffect(() => {
    if (!id) return;

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
          // Invalidate the query to refetch the book data
          queryClient.invalidateQueries({ queryKey: ['book', id] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, queryClient]);

  return query;
};

// Hook for realtime updates on books list
export const useBooksRealtime = () => {
  const queryClient = useQueryClient();

  useEffect(() => {
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
  }, [queryClient]);
};
