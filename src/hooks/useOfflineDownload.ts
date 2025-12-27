import { useState, useCallback, useRef, useEffect } from 'react';
import { Book } from './useBooks';
import { toast } from 'sonner';

const DB_NAME = 'maktaba-books-db';
const DB_VERSION = 1;
const BOOKS_STORE = 'saved-books';

interface DownloadProgress {
  bookId: string;
  progress: number; // 0-100
  status: 'idle' | 'downloading' | 'completed' | 'error';
  downloadedSize: number;
  totalSize: number;
}

interface SavedBook {
  id: string;
  book: Book;
  savedAt: number;
  fileBlob?: Blob;
  coverBlob?: Blob;
}

let dbInstance: IDBDatabase | null = null;

async function openDB(): Promise<IDBDatabase> {
  if (dbInstance) return dbInstance;

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      dbInstance = request.result;
      resolve(dbInstance);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      
      if (!db.objectStoreNames.contains(BOOKS_STORE)) {
        db.createObjectStore(BOOKS_STORE, { keyPath: 'id' });
      }
    };
  });
}

export function useOfflineDownload() {
  const [downloads, setDownloads] = useState<Map<string, DownloadProgress>>(new Map());
  const abortControllers = useRef<Map<string, AbortController>>(new Map());

  // Cleanup abort controllers on unmount
  useEffect(() => {
    return () => {
      abortControllers.current.forEach(controller => controller.abort());
    };
  }, []);

  const formatSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} ب`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} ك.ب`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} م.ب`;
  };

  const downloadWithProgress = useCallback(async (
    url: string,
    onProgress: (downloaded: number, total: number) => void,
    signal: AbortSignal
  ): Promise<Blob | null> => {
    try {
      const response = await fetch(url, { signal });
      if (!response.ok) return null;

      const contentLength = response.headers.get('content-length');
      const total = contentLength ? parseInt(contentLength, 10) : 0;

      if (!response.body) {
        const blob = await response.blob();
        onProgress(blob.size, blob.size);
        return blob;
      }

      const reader = response.body.getReader();
      const chunks: BlobPart[] = [];
      let downloaded = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        // Convert to regular ArrayBuffer for compatibility
        const arrayBuffer = value.buffer.slice(value.byteOffset, value.byteOffset + value.byteLength);
        chunks.push(new Uint8Array(arrayBuffer));
        downloaded += value.length;
        onProgress(downloaded, total || downloaded);
      }

      return new Blob(chunks);
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        return null;
      }
      throw error;
    }
  }, []);

  const downloadBook = useCallback(async (book: Book): Promise<boolean> => {
    const bookId = book.id;

    // Initialize download state
    setDownloads(prev => {
      const newMap = new Map(prev);
      newMap.set(bookId, {
        bookId,
        progress: 0,
        status: 'downloading',
        downloadedSize: 0,
        totalSize: 0,
      });
      return newMap;
    });

    // Create abort controller
    const controller = new AbortController();
    abortControllers.current.set(bookId, controller);

    const toastId = `download-${bookId}`;
    toast.loading('جاري تحميل الكتاب...', { id: toastId });

    try {
      const db = await openDB();
      let fileBlob: Blob | undefined;
      let coverBlob: Blob | undefined;

      // Download PDF file with progress
      if (book.file_url) {
        fileBlob = await downloadWithProgress(
          book.file_url,
          (downloaded, total) => {
            const progress = total > 0 ? Math.round((downloaded / total) * 90) : 0;
            setDownloads(prev => {
              const newMap = new Map(prev);
              newMap.set(bookId, {
                bookId,
                progress,
                status: 'downloading',
                downloadedSize: downloaded,
                totalSize: total,
              });
              return newMap;
            });
          },
          controller.signal
        ) || undefined;

        if (controller.signal.aborted) {
          toast.dismiss(toastId);
          setDownloads(prev => {
            const newMap = new Map(prev);
            newMap.delete(bookId);
            return newMap;
          });
          return false;
        }
      }

      // Download cover image (remaining 10%)
      if (book.cover_url) {
        try {
          const response = await fetch(book.cover_url, { signal: controller.signal });
          if (response.ok) {
            coverBlob = await response.blob();
          }
        } catch (err) {
          console.warn('Could not fetch cover:', err);
        }
      }

      // Update progress to 95%
      setDownloads(prev => {
        const newMap = new Map(prev);
        const current = prev.get(bookId);
        if (current) {
          newMap.set(bookId, { ...current, progress: 95 });
        }
        return newMap;
      });

      // Save to IndexedDB
      const savedBook: SavedBook = {
        id: bookId,
        book,
        savedAt: Date.now(),
        fileBlob,
        coverBlob,
      };

      const transaction = db.transaction(BOOKS_STORE, 'readwrite');
      const store = transaction.objectStore(BOOKS_STORE);
      store.put(savedBook);

      await new Promise<void>((resolve, reject) => {
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
      });

      // Complete!
      setDownloads(prev => {
        const newMap = new Map(prev);
        newMap.set(bookId, {
          bookId,
          progress: 100,
          status: 'completed',
          downloadedSize: fileBlob?.size || 0,
          totalSize: fileBlob?.size || 0,
        });
        return newMap;
      });

      toast.success('تم تحميل الكتاب للقراءة بدون إنترنت', { id: toastId });

      // Remove from downloads after 2 seconds
      setTimeout(() => {
        setDownloads(prev => {
          const newMap = new Map(prev);
          newMap.delete(bookId);
          return newMap;
        });
      }, 2000);

      return true;
    } catch (error) {
      console.error('Download failed:', error);
      
      setDownloads(prev => {
        const newMap = new Map(prev);
        newMap.set(bookId, {
          bookId,
          progress: 0,
          status: 'error',
          downloadedSize: 0,
          totalSize: 0,
        });
        return newMap;
      });

      toast.error('فشل في تحميل الكتاب', { id: toastId });
      return false;
    } finally {
      abortControllers.current.delete(bookId);
    }
  }, [downloadWithProgress]);

  const cancelDownload = useCallback((bookId: string) => {
    const controller = abortControllers.current.get(bookId);
    if (controller) {
      controller.abort();
      abortControllers.current.delete(bookId);
    }
    
    setDownloads(prev => {
      const newMap = new Map(prev);
      newMap.delete(bookId);
      return newMap;
    });

    toast.info('تم إلغاء التحميل');
  }, []);

  const getDownloadProgress = useCallback((bookId: string): DownloadProgress | null => {
    return downloads.get(bookId) || null;
  }, [downloads]);

  const isDownloading = useCallback((bookId: string): boolean => {
    const download = downloads.get(bookId);
    return download?.status === 'downloading';
  }, [downloads]);

  return {
    downloads,
    downloadBook,
    cancelDownload,
    getDownloadProgress,
    isDownloading,
    formatSize,
  };
}
