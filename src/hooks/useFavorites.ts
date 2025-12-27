import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export const useFavorites = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: favorites = [], isLoading } = useQuery({
    queryKey: ['favorites', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('favorites')
        .select(`
          id,
          book_id,
          created_at,
          books (
            id,
            title,
            author,
            cover_url,
            description,
            category_id,
            view_count,
            download_count,
            is_featured,
            pages,
            file_size,
            publish_year,
            language,
            publisher,
            isbn,
            file_url,
            created_at,
            updated_at
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  const addFavorite = useMutation({
    mutationFn: async (bookId: string) => {
      if (!user) throw new Error('يجب تسجيل الدخول أولاً');

      const { error } = await supabase
        .from('favorites')
        .insert({ user_id: user.id, book_id: bookId });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['favorites', user?.id] });
      toast.success('تمت الإضافة إلى المفضلة');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'حدث خطأ أثناء الإضافة');
    },
  });

  const removeFavorite = useMutation({
    mutationFn: async (bookId: string) => {
      if (!user) throw new Error('يجب تسجيل الدخول أولاً');

      const { error } = await supabase
        .from('favorites')
        .delete()
        .eq('user_id', user.id)
        .eq('book_id', bookId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['favorites', user?.id] });
      toast.success('تمت الإزالة من المفضلة');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'حدث خطأ أثناء الإزالة');
    },
  });

  const isFavorite = (bookId: string) => {
    return favorites.some((fav) => fav.book_id === bookId);
  };

  const toggleFavorite = (bookId: string) => {
    if (isFavorite(bookId)) {
      removeFavorite.mutate(bookId);
    } else {
      addFavorite.mutate(bookId);
    }
  };

  return {
    favorites,
    isLoading,
    isFavorite,
    toggleFavorite,
    addFavorite: addFavorite.mutate,
    removeFavorite: removeFavorite.mutate,
  };
};
