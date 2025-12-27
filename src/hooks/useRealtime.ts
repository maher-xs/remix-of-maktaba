import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

// Hook for realtime annotations sync
export const useRealtimeAnnotations = (bookId: string) => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  useEffect(() => {
    if (!bookId || !user) return;

    const channel = supabase
      .channel(`annotations-${bookId}-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'book_annotations',
          filter: `book_id=eq.${bookId}`
        },
        (payload) => {
          console.log('Annotation change:', payload);
          // Invalidate and refetch annotations
          queryClient.invalidateQueries({ queryKey: ['book-annotations', bookId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [bookId, user, queryClient]);
};

// Hook for realtime reading progress sync
export const useRealtimeReadingProgress = (bookId: string) => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  useEffect(() => {
    if (!bookId || !user) return;

    const channel = supabase
      .channel(`progress-${bookId}-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'reading_progress',
          filter: `book_id=eq.${bookId}`
        },
        (payload) => {
          console.log('Progress change:', payload);
          queryClient.invalidateQueries({ queryKey: ['reading-progress', bookId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [bookId, user, queryClient]);
};

// Hook for realtime new books notifications
export const useRealtimeBooks = () => {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel('books-updates')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'books'
        },
        (payload) => {
          console.log('New book added:', payload);
          queryClient.invalidateQueries({ queryKey: ['books'] });
          queryClient.invalidateQueries({ queryKey: ['latest-books'] });
          queryClient.invalidateQueries({ queryKey: ['featured-books'] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'books'
        },
        (payload) => {
          console.log('Book updated:', payload);
          queryClient.invalidateQueries({ queryKey: ['books'] });
          queryClient.invalidateQueries({ queryKey: ['book', payload.new.id] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
};

// Hook for realtime favorites sync
export const useRealtimeFavorites = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`favorites-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'favorites',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('Favorites change:', payload);
          queryClient.invalidateQueries({ queryKey: ['favorites', user.id] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient]);
};
