import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';

type Book = Tables<'books'>;

export const useAdvancedSearch = (query: string, enabled = true) => {
  return useQuery({
    queryKey: ['advanced-search', query],
    queryFn: async (): Promise<Book[]> => {
      if (!query || query.length < 2) return [];

      const { data, error } = await supabase
        .rpc('search_books', { search_query: query });

      if (error) {
        console.error('Search error:', error);
        throw error;
      }

      return data || [];
    },
    enabled: enabled && query.length >= 2,
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });
};
