import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { startOfMonth, subMonths, format } from 'date-fns';
import { ar } from 'date-fns/locale';

interface MonthlyData {
  month: string;
  books: number;
  pages: number;
}

interface CategoryData {
  name: string;
  value: number;
}

interface MonthlyReadingStats {
  monthlyData: MonthlyData[];
  categoryData: CategoryData[];
  booksThisMonth: number;
}

export const useMonthlyReadingStats = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['monthly-reading-stats', user?.id],
    queryFn: async (): Promise<MonthlyReadingStats> => {
      if (!user) {
        return { monthlyData: [], categoryData: [], booksThisMonth: 0 };
      }

      // Get reading progress for the last 6 months
      const sixMonthsAgo = subMonths(new Date(), 6);
      
      const { data: readingProgress, error: progressError } = await supabase
        .from('reading_progress')
        .select(`
          id,
          book_id,
          current_page,
          is_completed,
          created_at,
          last_read_at,
          books:book_id (
            id,
            title,
            pages,
            category_id,
            categories:category_id (
              id,
              name
            )
          )
        `)
        .eq('user_id', user.id)
        .gte('created_at', sixMonthsAgo.toISOString());

      if (progressError) {
        console.error('Error fetching reading progress:', progressError);
        throw progressError;
      }

      // Calculate monthly data
      const monthlyMap = new Map<string, { books: number; pages: number }>();
      const categoryMap = new Map<string, number>();
      
      // Initialize last 6 months
      for (let i = 5; i >= 0; i--) {
        const monthDate = subMonths(new Date(), i);
        const monthKey = format(monthDate, 'yyyy-MM');
        const monthName = format(monthDate, 'MMMM', { locale: ar });
        monthlyMap.set(monthKey, { books: 0, pages: 0 });
      }

      // Get books read this month
      const currentMonthStart = startOfMonth(new Date());
      let booksThisMonth = 0;

      // Process reading progress
      readingProgress?.forEach((progress) => {
        const createdDate = new Date(progress.created_at);
        const monthKey = format(createdDate, 'yyyy-MM');
        
        // Count books this month
        if (createdDate >= currentMonthStart) {
          booksThisMonth++;
        }

        // Update monthly data
        if (monthlyMap.has(monthKey)) {
          const current = monthlyMap.get(monthKey)!;
          monthlyMap.set(monthKey, {
            books: current.books + 1,
            pages: current.pages + (progress.current_page || 0),
          });
        }

        // Update category data
        const book = progress.books as any;
        if (book?.categories?.name) {
          const categoryName = book.categories.name;
          categoryMap.set(categoryName, (categoryMap.get(categoryName) || 0) + 1);
        }
      });

      // Convert to arrays
      const monthlyData: MonthlyData[] = [];
      for (let i = 5; i >= 0; i--) {
        const monthDate = subMonths(new Date(), i);
        const monthKey = format(monthDate, 'yyyy-MM');
        const monthName = format(monthDate, 'MMMM', { locale: ar });
        const data = monthlyMap.get(monthKey) || { books: 0, pages: 0 };
        monthlyData.push({
          month: monthName,
          books: data.books,
          pages: data.pages,
        });
      }

      // Convert category map to array and sort by value
      const categoryData: CategoryData[] = Array.from(categoryMap.entries())
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 5); // Top 5 categories

      return {
        monthlyData,
        categoryData,
        booksThisMonth,
      };
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 5,
  });
};
