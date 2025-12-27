import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface ReadingStats {
  total_books_read: number;
  total_pages_read: number;
  books_completed: number;
  total_annotations: number;
  favorite_category: string | null;
  reading_streak: number;
  last_read_at: string | null;
}

export const useReadingStats = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['reading-stats', user?.id],
    queryFn: async (): Promise<ReadingStats | null> => {
      if (!user) return null;

      const { data, error } = await supabase
        .rpc('get_reading_stats', { p_user_id: user.id });

      if (error) {
        console.error('Stats error:', error);
        throw error;
      }

      return data?.[0] || null;
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });
};
