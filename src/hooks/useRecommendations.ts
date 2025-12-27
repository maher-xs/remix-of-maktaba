import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface RecommendedBook {
  id: string;
  title: string;
  author: string;
  cover_url: string | null;
  description: string | null;
  category_id: string | null;
  view_count: number;
  download_count: number;
  score: number;
}

export const useBookRecommendations = (limit = 10) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['book-recommendations', user?.id, limit],
    queryFn: async (): Promise<RecommendedBook[]> => {
      if (!user) return [];

      const { data, error } = await supabase
        .rpc('get_book_recommendations', { 
          p_user_id: user.id,
          p_limit: limit 
        });

      if (error) {
        console.error('Recommendations error:', error);
        throw error;
      }

      return (data || []) as RecommendedBook[];
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 15, // Cache for 15 minutes
  });
};
