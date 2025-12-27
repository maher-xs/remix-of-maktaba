import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';
import { validateReadingListContent } from '@/lib/contentModeration';

export interface ReadingList {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  is_public: boolean;
  cover_url: string | null;
  created_at: string;
  updated_at: string;
  book_count?: number;
}

export interface ReadingListBook {
  id: string;
  list_id: string;
  book_id: string;
  added_at: string;
  notes: string | null;
  position: number;
  book?: {
    id: string;
    title: string;
    author: string;
    cover_url: string | null;
  };
}

export const useReadingLists = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: lists, isLoading } = useQuery({
    queryKey: ['reading-lists', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('reading_lists')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Get book counts for each list
      const listsWithCounts = await Promise.all(
        data.map(async (list) => {
          const { count } = await supabase
            .from('reading_list_books')
            .select('*', { count: 'exact', head: true })
            .eq('list_id', list.id);
          
          return { ...list, book_count: count || 0 };
        })
      );

      return listsWithCounts as ReadingList[];
    },
    enabled: !!user,
  });

  const createList = useMutation({
    mutationFn: async ({ name, description, is_public, cover_url }: { 
      name: string; 
      description?: string; 
      is_public?: boolean;
      cover_url?: string | null;
    }) => {
      if (!user) throw new Error('Not authenticated');
      
      // 🔐 Content moderation - check for profanity
      const contentCheck = validateReadingListContent({ name, description });
      if (!contentCheck.isClean) {
        throw new Error(contentCheck.message);
      }
      
      const { data, error } = await supabase
        .from('reading_lists')
        .insert({
          user_id: user.id,
          name,
          description: description || null,
          is_public: is_public || false,
          cover_url: cover_url || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reading-lists'] });
      toast.success('تم إنشاء القائمة بنجاح');
    },
    onError: () => {
      toast.error('فشل في إنشاء القائمة');
    },
  });

  const updateList = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ReadingList> & { id: string }) => {
      const { data, error } = await supabase
        .from('reading_lists')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reading-lists'] });
      toast.success('تم تحديث القائمة');
    },
  });

  const deleteList = useMutation({
    mutationFn: async (listId: string) => {
      const { error } = await supabase
        .from('reading_lists')
        .delete()
        .eq('id', listId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reading-lists'] });
      toast.success('تم حذف القائمة');
    },
  });

  const addBookToList = useMutation({
    mutationFn: async ({ listId, bookId, notes }: { 
      listId: string; 
      bookId: string; 
      notes?: string 
    }) => {
      // Get the max position for this list
      const { data: existingBooks } = await supabase
        .from('reading_list_books')
        .select('position')
        .eq('list_id', listId)
        .order('position', { ascending: false })
        .limit(1);
      
      const nextPosition = existingBooks && existingBooks.length > 0 
        ? (existingBooks[0].position || 0) + 1 
        : 1;

      const { error } = await supabase
        .from('reading_list_books')
        .insert({
          list_id: listId,
          book_id: bookId,
          notes: notes || null,
          position: nextPosition,
        });

      if (error) {
        if (error.code === '23505') {
          throw new Error('الكتاب موجود بالفعل في القائمة');
        }
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reading-lists'] });
      queryClient.invalidateQueries({ queryKey: ['reading-list-books'] });
      toast.success('تمت إضافة الكتاب للقائمة');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const removeBookFromList = useMutation({
    mutationFn: async ({ listId, bookId }: { listId: string; bookId: string }) => {
      const { error } = await supabase
        .from('reading_list_books')
        .delete()
        .eq('list_id', listId)
        .eq('book_id', bookId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reading-lists'] });
      queryClient.invalidateQueries({ queryKey: ['reading-list-books'] });
      toast.success('تم إزالة الكتاب من القائمة');
    },
  });

  const reorderBooks = useMutation({
    mutationFn: async ({ listId, bookIds }: { listId: string; bookIds: string[] }) => {
      // Update positions for all books in the new order
      const updates = bookIds.map((bookId, index) => 
        supabase
          .from('reading_list_books')
          .update({ position: index + 1 })
          .eq('list_id', listId)
          .eq('book_id', bookId)
      );
      
      await Promise.all(updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reading-list-books'] });
    },
    onError: () => {
      toast.error('فشل في إعادة ترتيب الكتب');
    },
  });

  return {
    lists: lists || [],
    isLoading,
    createList: createList.mutate,
    updateList: updateList.mutate,
    deleteList: deleteList.mutate,
    addBookToList: addBookToList.mutate,
    removeBookFromList: removeBookFromList.mutate,
    reorderBooks: reorderBooks.mutate,
    isCreating: createList.isPending,
  };
};

export const useReadingListBooks = (listId: string) => {
  return useQuery({
    queryKey: ['reading-list-books', listId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('reading_list_books')
        .select(`
          *,
          book:books(id, title, author, cover_url)
        `)
        .eq('list_id', listId)
        .order('position', { ascending: true });

      if (error) throw error;
      return data as ReadingListBook[];
    },
    enabled: !!listId,
  });
};

// Hook for fetching followed reading lists
export interface FollowedReadingList {
  id: string;
  list_id: string;
  user_id: string;
  created_at: string;
  reading_list?: {
    id: string;
    name: string;
    description: string | null;
    is_public: boolean;
    cover_url: string | null;
    created_at: string;
    updated_at: string;
    user_id: string;
  };
  owner?: {
    id: string;
    full_name: string | null;
    username: string | null;
    avatar_url: string | null;
  };
  book_count?: number;
}

export const useFollowedReadingLists = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: followedLists, isLoading } = useQuery({
    queryKey: ['followed-reading-lists', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('reading_list_followers')
        .select(`
          *,
          reading_list:reading_lists(*)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Get book counts and owner info for each list
      const listsWithDetails = await Promise.all(
        data.map(async (item) => {
          if (!item.reading_list) return null;
          
          // Get book count
          const { count } = await supabase
            .from('reading_list_books')
            .select('*', { count: 'exact', head: true })
            .eq('list_id', item.list_id);
          
          // Get owner info
          const { data: ownerData } = await supabase
            .from('profiles')
            .select('id, full_name, username, avatar_url')
            .eq('id', item.reading_list.user_id)
            .maybeSingle();
          
          return { 
            ...item, 
            book_count: count || 0,
            owner: ownerData
          };
        })
      );

      return listsWithDetails.filter(Boolean) as FollowedReadingList[];
    },
    enabled: !!user,
  });

  const unfollowList = useMutation({
    mutationFn: async (listId: string) => {
      if (!user) throw new Error('Not authenticated');
      
      const { error } = await supabase
        .from('reading_list_followers')
        .delete()
        .eq('list_id', listId)
        .eq('user_id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['followed-reading-lists'] });
      toast.success('تم إلغاء المتابعة');
    },
    onError: () => {
      toast.error('فشل في إلغاء المتابعة');
    },
  });

  return {
    followedLists: followedLists || [],
    isLoading,
    unfollowList: unfollowList.mutate,
  };
};
