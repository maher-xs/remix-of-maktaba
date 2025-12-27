import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { addToSyncQueue } from '@/hooks/useOfflineSync';
import { generateUUID } from '@/lib/utils';

export interface Annotation {
  id: string;
  book_id: string;
  user_id: string;
  page_number: number;
  annotation_type: string | null;
  content: string;
  color: string | null;
  created_at: string;
  updated_at: string;
}

export const useBookAnnotations = (bookId: string) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['book-annotations', bookId, user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('book_annotations')
        .select('*')
        .eq('book_id', bookId)
        .eq('user_id', user.id)
        .order('page_number', { ascending: true });

      if (error) throw error;
      return data as Annotation[];
    },
    enabled: !!bookId && !!user,
  });
};

export const useAddAnnotation = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (annotation: {
      book_id: string;
      page_number: number;
      annotation_type?: string;
      content?: string;
      color?: string;
    }) => {
      if (!user) throw new Error('يجب تسجيل الدخول');

      const insertData = {
        id: generateUUID(),
        book_id: annotation.book_id,
        page_number: annotation.page_number,
        user_id: user.id,
        content: annotation.content || '',
        annotation_type: annotation.annotation_type || 'highlight',
        color: annotation.color || 'yellow',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Check if online
      if (!navigator.onLine) {
        // Queue for later sync
        addToSyncQueue({
          type: 'annotation',
          action: 'create',
          data: insertData,
        });
        toast.info('سيتم مزامنة الملاحظة عند استعادة الاتصال');
        return insertData;
      }

      const { data, error } = await supabase
        .from('book_annotations')
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['book-annotations', data.book_id] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
};

export const useUpdateAnnotation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, bookId, ...updates }: { id: string; bookId?: string; content?: string; color?: string }) => {
      // Check if online
      if (!navigator.onLine) {
        addToSyncQueue({
          type: 'annotation',
          action: 'update',
          data: { id, ...updates, updated_at: new Date().toISOString() },
        });
        toast.info('سيتم مزامنة التحديث عند استعادة الاتصال');
        return { id, book_id: bookId, ...updates };
      }

      const { data, error } = await supabase
        .from('book_annotations')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['book-annotations', data.book_id] });
    },
  });
};

export const useDeleteAnnotation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, bookId }: { id: string; bookId: string }) => {
      // Check if online
      if (!navigator.onLine) {
        addToSyncQueue({
          type: 'annotation',
          action: 'delete',
          data: { id },
        });
        toast.info('سيتم مزامنة الحذف عند استعادة الاتصال');
        return bookId;
      }

      const { error } = await supabase
        .from('book_annotations')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return bookId;
    },
    onSuccess: (bookId) => {
      queryClient.invalidateQueries({ queryKey: ['book-annotations', bookId] });
    },
  });
};

export const useReadingProgress = (bookId: string) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['reading-progress', bookId, user?.id],
    queryFn: async () => {
      if (!user) return null;

      const { data, error } = await supabase
        .from('reading_progress')
        .select('*')
        .eq('book_id', bookId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!bookId && !!user,
  });
};

export const useUpdateReadingProgress = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ bookId, currentPage, totalPages }: { bookId: string; currentPage: number; totalPages?: number }) => {
      if (!user) return null;

      const progressData = {
        book_id: bookId,
        user_id: user.id,
        current_page: currentPage,
        total_pages: totalPages,
        last_read_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Check if online
      if (!navigator.onLine) {
        addToSyncQueue({
          type: 'reading_progress',
          action: 'update',
          data: progressData,
        });
        return progressData;
      }

      const { data, error } = await supabase
        .from('reading_progress')
        .upsert(progressData, {
          onConflict: 'book_id,user_id',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      if (data) {
        queryClient.invalidateQueries({ queryKey: ['reading-progress', data.book_id] });
        queryClient.invalidateQueries({ queryKey: ['currently-reading'] });
      }
    },
  });
};
