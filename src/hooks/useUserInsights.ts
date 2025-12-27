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

interface CategoryStats {
  name: string;
  count: number;
  color: string;
  icon: string;
}

interface AnnotationCounts {
  highlight: number;
  note: number;
  bookmark: number;
}

interface ActivityPoint {
  date: string;
  pages: number;
}

interface UserInsights {
  stats: ReadingStats | null;
  topCategories: CategoryStats[];
  annotationCounts: AnnotationCounts;
  activityChart: ActivityPoint[];
  generatedAt: string;
}

export const useUserInsights = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['user-insights', user?.id],
    queryFn: async (): Promise<UserInsights | null> => {
      if (!user) return null;

      const { data, error } = await supabase.functions.invoke('get-user-insights');

      if (error) {
        console.error('Insights error:', error);
        throw error;
      }

      return data as UserInsights;
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 10, // Cache for 10 minutes
  });
};
