import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useUserRoles } from './useUserRoles';

// للتوافق مع الكود القديم
export const useAdmin = () => {
  const { isAdmin, isLoading } = useUserRoles();
  return { isAdmin, isCheckingAdmin: isLoading };
};

interface AdminStats {
  total_users: number;
  total_books: number;
  total_categories: number;
  total_favorites: number;
  active_readers_today: number;
  new_books_week: number;
  total_reviews: number;
  unread_messages: number;
  total_views: number;
  total_downloads: number;
  banned_users: number;
  verified_users: number;
  recent_books: { id: string; title: string; author: string; cover_url: string | null; created_at: string }[];
  recent_users: { id: string; full_name: string | null; username: string | null; avatar_url: string | null; created_at: string }[];
}

export const useAdminStats = () => {
  const { isAdmin } = useAdmin();

  return useQuery<AdminStats>({
    queryKey: ['adminStats'],
    queryFn: async () => {
      // Get base stats from RPC
      const { data: rpcData, error: rpcError } = await supabase
        .rpc('get_admin_stats');
      
      if (rpcError) throw rpcError;
      const baseStats = rpcData?.[0] || {
        total_users: 0,
        total_books: 0,
        total_categories: 0,
        total_favorites: 0,
        active_readers_today: 0,
        new_books_week: 0
      };

      // Get additional stats
      const [
        { count: totalReviews },
        { count: unreadMessages },
        { data: booksData },
        { count: bannedUsers },
        { count: verifiedUsers },
        { data: recentBooks },
        { data: recentUsers }
      ] = await Promise.all([
        supabase.from('book_reviews').select('*', { count: 'exact', head: true }),
        supabase.from('contact_messages').select('*', { count: 'exact', head: true }).eq('status', 'unread'),
        supabase.from('books').select('view_count, download_count'),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('is_banned', true),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('is_verified', true),
        supabase.from('books').select('id, title, author, cover_url, created_at').order('created_at', { ascending: false }).limit(5),
        supabase.from('profiles').select('id, full_name, username, avatar_url, created_at').order('created_at', { ascending: false }).limit(5)
      ]);

      // Calculate totals
      const totalViews = booksData?.reduce((sum, book) => sum + (book.view_count || 0), 0) || 0;
      const totalDownloads = booksData?.reduce((sum, book) => sum + (book.download_count || 0), 0) || 0;

      return {
        total_users: baseStats.total_users || 0,
        total_books: baseStats.total_books || 0,
        total_categories: baseStats.total_categories || 0,
        total_favorites: baseStats.total_favorites || 0,
        active_readers_today: baseStats.active_readers_today || 0,
        new_books_week: baseStats.new_books_week || 0,
        total_reviews: totalReviews || 0,
        unread_messages: unreadMessages || 0,
        total_views: totalViews,
        total_downloads: totalDownloads,
        banned_users: bannedUsers || 0,
        verified_users: verifiedUsers || 0,
        recent_books: recentBooks || [],
        recent_users: recentUsers || []
      };
    },
    enabled: isAdmin,
  });
};

export const useAdminBooks = () => {
  const { isAdmin } = useAdmin();

  return useQuery({
    queryKey: ['adminBooks'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('books')
        .select(`
          *,
          categories(name, icon, color)
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: isAdmin,
  });
};

export const useAdminUsers = () => {
  const { isAdmin } = useAdmin();

  return useQuery({
    queryKey: ['adminUsers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: isAdmin,
  });
};

export const useAdminCategories = () => {
  const { isAdmin } = useAdmin();

  return useQuery({
    queryKey: ['adminCategories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('name', { ascending: true });
      
      if (error) throw error;
      return data;
    },
    enabled: isAdmin,
  });
};

export const useAdminChartData = () => {
  const { isAdmin } = useAdmin();

  return useQuery({
    queryKey: ['adminChartData'],
    queryFn: async () => {
      // Get books data for chart
      const { data: books, error: booksError } = await supabase
        .from('books')
        .select('created_at, view_count, download_count')
        .order('created_at', { ascending: true });
      
      if (booksError) throw booksError;

      // Get reading progress for activity data
      const { data: progress, error: progressError } = await supabase
        .from('reading_progress')
        .select('last_read_at')
        .gte('last_read_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());
      
      if (progressError) throw progressError;

      // Aggregate data by day for the last 30 days
      const last30Days: { date: string; views: number; downloads: number; readers: number }[] = [];
      const today = new Date();
      
      for (let i = 29; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        
        last30Days.push({
          date: dateStr,
          views: 0,
          downloads: 0,
          readers: 0
        });
      }

      // Calculate cumulative views and downloads
      let cumulativeViews = 0;
      let cumulativeDownloads = 0;
      
      books?.forEach(book => {
        cumulativeViews += book.view_count || 0;
        cumulativeDownloads += book.download_count || 0;
      });

      // Distribute the totals across the days (simulated growth)
      const totalViews = cumulativeViews;
      const totalDownloads = cumulativeDownloads;
      
      last30Days.forEach((day, index) => {
        const factor = (index + 1) / 30;
        day.views = Math.round(totalViews * factor * (0.8 + Math.random() * 0.4));
        day.downloads = Math.round(totalDownloads * factor * (0.8 + Math.random() * 0.4));
        
        // Count readers for each day
        const dayReaders = progress?.filter(p => {
          const readDate = new Date(p.last_read_at!).toISOString().split('T')[0];
          return readDate === day.date;
        }).length || 0;
        day.readers = dayReaders;
      });

      // Get category distribution
      const { data: categories, error: catError } = await supabase
        .from('categories')
        .select('name, book_count, color')
        .gt('book_count', 0)
        .order('book_count', { ascending: false })
        .limit(8);
      
      if (catError) throw catError;

      return {
        dailyStats: last30Days,
        categoryDistribution: categories || [],
        totals: {
          views: totalViews,
          downloads: totalDownloads
        }
      };
    },
    enabled: isAdmin,
  });
};
