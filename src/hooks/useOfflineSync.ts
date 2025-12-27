import { useEffect, useCallback, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useOnlineStatus } from '@/hooks/useOfflineStorage';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { generateUUID } from '@/lib/utils';

const SYNC_QUEUE_KEY = 'maktaba-sync-queue';
const LAST_SYNC_KEY = 'maktaba-last-sync';

interface SyncItem {
  id: string;
  type: 'annotation' | 'reading_progress' | 'favorite';
  action: 'create' | 'update' | 'delete';
  data: any;
  timestamp: number;
  retryCount?: number;
}

// Get sync queue from localStorage
function getSyncQueue(): SyncItem[] {
  try {
    const queue = localStorage.getItem(SYNC_QUEUE_KEY);
    return queue ? JSON.parse(queue) : [];
  } catch {
    return [];
  }
}

// Save sync queue to localStorage
function saveSyncQueue(queue: SyncItem[]): void {
  localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));
}

// Add item to sync queue
export function addToSyncQueue(item: Omit<SyncItem, 'id' | 'timestamp'>): void {
  const queue = getSyncQueue();
  const newItem: SyncItem = {
    ...item,
    id: generateUUID(),
    timestamp: Date.now(),
  };
  queue.push(newItem);
  saveSyncQueue(queue);
}

// Remove item from sync queue
function removeFromSyncQueue(id: string): void {
  const queue = getSyncQueue().filter(item => item.id !== id);
  saveSyncQueue(queue);
}

// Clear sync queue
export function clearSyncQueue(): void {
  localStorage.removeItem(SYNC_QUEUE_KEY);
}

// Get pending sync count
export function getPendingSyncCount(): number {
  return getSyncQueue().length;
}

// Get last sync timestamp
export function getLastSyncTime(): Date | null {
  const timestamp = localStorage.getItem(LAST_SYNC_KEY);
  return timestamp ? new Date(parseInt(timestamp)) : null;
}

// Set last sync timestamp
function setLastSyncTime(): void {
  localStorage.setItem(LAST_SYNC_KEY, Date.now().toString());
}

// Sync a single item - standalone function
async function syncSingleItem(item: SyncItem): Promise<boolean> {
  try {
    if (item.type === 'annotation') {
      if (item.action === 'create') {
        const { error } = await supabase
          .from('book_annotations')
          .insert(item.data);
        if (error) throw error;
      } else if (item.action === 'update') {
        const { id, ...updates } = item.data;
        const { error } = await supabase
          .from('book_annotations')
          .update(updates)
          .eq('id', id);
        if (error) throw error;
      } else if (item.action === 'delete') {
        const { error } = await supabase
          .from('book_annotations')
          .delete()
          .eq('id', item.data.id);
        if (error) throw error;
      }
    } else if (item.type === 'reading_progress') {
      const { error } = await supabase
        .from('reading_progress')
        .upsert(item.data, { onConflict: 'book_id,user_id' });
      if (error) throw error;
    } else if (item.type === 'favorite') {
      if (item.action === 'create') {
        const { error } = await supabase
          .from('favorites')
          .insert(item.data);
        if (error) throw error;
      } else if (item.action === 'delete') {
        const { error } = await supabase
          .from('favorites')
          .delete()
          .eq('id', item.data.id);
        if (error) throw error;
      }
    }
    return true;
  } catch (error) {
    console.error('Sync error for item:', item, error);
    return false;
  }
}

// Hook to manage offline sync - simplified version
export function useOfflineSync() {
  const isOnline = useOnlineStatus();
  const queryClient = useQueryClient();
  const isSyncingRef = useRef(false);
  const [pendingCount, setPendingCount] = useState(0);

  // Update pending count
  useEffect(() => {
    const updateCount = () => {
      setPendingCount(getSyncQueue().length);
    };
    updateCount();
    const interval = setInterval(updateCount, 2000);
    return () => clearInterval(interval);
  }, []);

  // Sync all pending items
  const syncAll = useCallback(async (showToast = true) => {
    if (!isOnline || isSyncingRef.current) return;

    const queue = getSyncQueue();
    if (queue.length === 0) return;

    isSyncingRef.current = true;
    let successCount = 0;
    let failCount = 0;

    if (showToast) {
      toast.loading(`جاري مزامنة ${queue.length} عنصر...`, { id: 'sync' });
    }

    for (const item of queue) {
      const success = await syncSingleItem(item);
      if (success) {
        removeFromSyncQueue(item.id);
        successCount++;
      } else {
        // Increment retry count
        const updatedQueue = getSyncQueue().map(q => 
          q.id === item.id ? { ...q, retryCount: (q.retryCount || 0) + 1 } : q
        );
        // Remove items that have failed too many times
        const filteredQueue = updatedQueue.filter(q => (q.retryCount || 0) < 5);
        saveSyncQueue(filteredQueue);
        failCount++;
      }
    }

    // Invalidate queries to refresh data
    queryClient.invalidateQueries({ queryKey: ['book-annotations'] });
    queryClient.invalidateQueries({ queryKey: ['reading-progress'] });
    queryClient.invalidateQueries({ queryKey: ['currently-reading'] });
    queryClient.invalidateQueries({ queryKey: ['favorites'] });

    if (showToast) {
      if (successCount > 0 && failCount === 0) {
        toast.success(`تمت مزامنة ${successCount} عنصر بنجاح`, { id: 'sync' });
      } else if (successCount > 0 && failCount > 0) {
        toast.warning(`تمت مزامنة ${successCount} عنصر، فشل ${failCount}`, { id: 'sync' });
      } else if (failCount > 0) {
        toast.error(`فشل في مزامنة ${failCount} عنصر`, { id: 'sync' });
      }
    }

    setLastSyncTime();
    setPendingCount(getSyncQueue().length);
    isSyncingRef.current = false;
  }, [isOnline, queryClient]);

  // Auto-sync when coming back online
  useEffect(() => {
    if (isOnline && getPendingSyncCount() > 0) {
      const timeout = setTimeout(() => {
        syncAll();
      }, 2000);
      return () => clearTimeout(timeout);
    }
  }, [isOnline, syncAll]);

  return {
    syncAll,
    pendingCount,
    isOnline,
    lastSyncTime: getLastSyncTime(),
  };
}

// Hook for offline-capable annotations
export function useOfflineAnnotations(bookId: string, userId: string | undefined) {
  const isOnline = useOnlineStatus();

  const addAnnotationOffline = useCallback((annotation: {
    page_number: number;
    annotation_type?: string;
    content?: string;
    color?: string;
  }) => {
    if (!userId) return;

    const data = {
      id: generateUUID(),
      book_id: bookId,
      user_id: userId,
      page_number: annotation.page_number,
      annotation_type: annotation.annotation_type || 'highlight',
      content: annotation.content || '',
      color: annotation.color || 'yellow',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (!isOnline) {
      addToSyncQueue({
        type: 'annotation',
        action: 'create',
        data,
      });
      toast.info('سيتم مزامنة الملاحظة عند استعادة الاتصال');
    }

    return data;
  }, [bookId, userId, isOnline]);

  const updateAnnotationOffline = useCallback((id: string, updates: {
    content?: string;
    color?: string;
  }) => {
    if (!isOnline) {
      addToSyncQueue({
        type: 'annotation',
        action: 'update',
        data: { id, ...updates, updated_at: new Date().toISOString() },
      });
      toast.info('سيتم مزامنة التحديث عند استعادة الاتصال');
    }
  }, [isOnline]);

  const deleteAnnotationOffline = useCallback((id: string) => {
    if (!isOnline) {
      addToSyncQueue({
        type: 'annotation',
        action: 'delete',
        data: { id },
      });
      toast.info('سيتم مزامنة الحذف عند استعادة الاتصال');
    }
  }, [isOnline]);

  return {
    addAnnotationOffline,
    updateAnnotationOffline,
    deleteAnnotationOffline,
    isOnline,
  };
}

// Hook for offline-capable reading progress
export function useOfflineReadingProgress(bookId: string, userId: string | undefined) {
  const isOnline = useOnlineStatus();

  const updateProgressOffline = useCallback((currentPage: number, totalPages?: number) => {
    if (!userId) return;

    const data = {
      book_id: bookId,
      user_id: userId,
      current_page: currentPage,
      total_pages: totalPages,
      last_read_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (!isOnline) {
      // Remove any existing progress updates for this book to avoid duplicates
      const queue = getSyncQueue().filter(
        item => !(item.type === 'reading_progress' && item.data.book_id === bookId)
      );
      saveSyncQueue(queue);

      addToSyncQueue({
        type: 'reading_progress',
        action: 'update',
        data,
      });
    }

    return data;
  }, [bookId, userId, isOnline]);

  return {
    updateProgressOffline,
    isOnline,
  };
}

// Hook for offline-capable favorites
export function useOfflineFavorites(userId: string | undefined) {
  const isOnline = useOnlineStatus();

  const addFavoriteOffline = useCallback((bookId: string) => {
    if (!userId) return;

    const data = {
      id: generateUUID(),
      book_id: bookId,
      user_id: userId,
      created_at: new Date().toISOString(),
    };

    if (!isOnline) {
      addToSyncQueue({
        type: 'favorite',
        action: 'create',
        data,
      });
      toast.info('سيتم إضافة الكتاب للمفضلة عند استعادة الاتصال');
    }

    return data;
  }, [userId, isOnline]);

  const removeFavoriteOffline = useCallback((favoriteId: string) => {
    if (!isOnline) {
      addToSyncQueue({
        type: 'favorite',
        action: 'delete',
        data: { id: favoriteId },
      });
      toast.info('سيتم إزالة الكتاب من المفضلة عند استعادة الاتصال');
    }
  }, [isOnline]);

  return {
    addFavoriteOffline,
    removeFavoriteOffline,
    isOnline,
  };
}
