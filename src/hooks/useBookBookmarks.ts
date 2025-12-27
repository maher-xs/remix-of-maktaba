import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface Bookmark {
  id: string;
  user_id: string;
  book_id: string;
  page_number: number;
  title: string | null;
  note: string | null;
  created_at: string;
  updated_at: string;
}

export const useBookBookmarks = (bookId: string) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch all bookmarks for a book
  const { data: bookmarks = [], isLoading } = useQuery({
    queryKey: ['book-bookmarks', bookId, user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('book_bookmarks' as any)
        .select('*')
        .eq('book_id', bookId)
        .eq('user_id', user.id)
        .order('page_number', { ascending: true });
      
      if (error) throw error;
      return (data || []) as unknown as Bookmark[];
    },
    enabled: !!user && !!bookId,
  });

  // Check if a page is bookmarked
  const isPageBookmarked = (pageNumber: number) => {
    return bookmarks.some(b => b.page_number === pageNumber);
  };

  // Get bookmark for a specific page
  const getBookmarkForPage = (pageNumber: number) => {
    return bookmarks.find(b => b.page_number === pageNumber);
  };

  // Add bookmark
  const { mutate: addBookmark, isPending: isAdding } = useMutation({
    mutationFn: async ({ pageNumber, title, note }: { pageNumber: number; title?: string; note?: string }) => {
      if (!user) throw new Error('Not authenticated');
      
      const { data, error } = await supabase
        .from('book_bookmarks' as any)
        .insert({
          user_id: user.id,
          book_id: bookId,
          page_number: pageNumber,
          title: title || `صفحة ${pageNumber}`,
          note: note || null,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['book-bookmarks', bookId] });
      toast.success('تمت إضافة الإشارة المرجعية');
    },
    onError: (error: any) => {
      if (error.code === '23505') {
        toast.error('هذه الصفحة محفوظة مسبقاً');
      } else {
        toast.error('حدث خطأ أثناء الحفظ');
      }
    },
  });

  // Remove bookmark
  const { mutate: removeBookmark, isPending: isRemoving } = useMutation({
    mutationFn: async (pageNumber: number) => {
      if (!user) throw new Error('Not authenticated');
      
      const { error } = await supabase
        .from('book_bookmarks' as any)
        .delete()
        .eq('book_id', bookId)
        .eq('user_id', user.id)
        .eq('page_number', pageNumber);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['book-bookmarks', bookId] });
      toast.success('تم حذف الإشارة المرجعية');
    },
    onError: () => {
      toast.error('حدث خطأ أثناء الحذف');
    },
  });

  // Toggle bookmark
  const toggleBookmark = (pageNumber: number, title?: string) => {
    if (isPageBookmarked(pageNumber)) {
      removeBookmark(pageNumber);
    } else {
      addBookmark({ pageNumber, title });
    }
  };

  // Update bookmark note
  const { mutate: updateBookmarkNote } = useMutation({
    mutationFn: async ({ pageNumber, note }: { pageNumber: number; note: string }) => {
      if (!user) throw new Error('Not authenticated');
      
      const { error } = await supabase
        .from('book_bookmarks' as any)
        .update({ note, updated_at: new Date().toISOString() })
        .eq('book_id', bookId)
        .eq('user_id', user.id)
        .eq('page_number', pageNumber);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['book-bookmarks', bookId] });
      toast.success('تم تحديث الملاحظة');
    },
  });

  return {
    bookmarks,
    isLoading,
    isPageBookmarked,
    getBookmarkForPage,
    addBookmark,
    removeBookmark,
    toggleBookmark,
    updateBookmarkNote,
    isAdding,
    isRemoving,
  };
};
