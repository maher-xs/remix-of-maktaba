import { useState, useEffect, useCallback } from 'react';
import { Book } from './useBooks';
import { toast } from 'sonner';

const DB_NAME = 'maktaba-books-db';
const DB_VERSION = 1;
const BOOKS_STORE = 'saved-books';
const FILES_STORE = 'book-files';

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
      
      if (!db.objectStoreNames.contains(FILES_STORE)) {
        db.createObjectStore(FILES_STORE, { keyPath: 'id' });
      }
    };
  });
}

export async function saveBookOffline(book: Book): Promise<boolean> {
  try {
    const db = await openDB();
    
    // Fetch the PDF file if available
    let fileBlob: Blob | undefined;
    if (book.file_url) {
      try {
        const response = await fetch(book.file_url);
        if (response.ok) {
          fileBlob = await response.blob();
        }
      } catch (err) {
        console.warn('Could not fetch book file:', err);
      }
    }

    // Fetch the cover image if available
    let coverBlob: Blob | undefined;
    if (book.cover_url) {
      try {
        const response = await fetch(book.cover_url);
        if (response.ok) {
          coverBlob = await response.blob();
        }
      } catch (err) {
        console.warn('Could not fetch cover image:', err);
      }
    }

    const savedBook: SavedBook = {
      id: book.id,
      book,
      savedAt: Date.now(),
      fileBlob,
      coverBlob,
    };

    const transaction = db.transaction(BOOKS_STORE, 'readwrite');
    const store = transaction.objectStore(BOOKS_STORE);
    store.put(savedBook);

    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve(true);
      transaction.onerror = () => reject(transaction.error);
    });
  } catch (error) {
    console.error('Failed to save book offline:', error);
    return false;
  }
}

export async function getOfflineBook(id: string): Promise<SavedBook | null> {
  try {
    const db = await openDB();
    const transaction = db.transaction(BOOKS_STORE, 'readonly');
    const store = transaction.objectStore(BOOKS_STORE);
    const request = store.get(id);

    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Failed to get offline book:', error);
    return null;
  }
}

export async function getAllOfflineBooks(): Promise<SavedBook[]> {
  try {
    const db = await openDB();
    const transaction = db.transaction(BOOKS_STORE, 'readonly');
    const store = transaction.objectStore(BOOKS_STORE);
    const request = store.getAll();

    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Failed to get all offline books:', error);
    return [];
  }
}

export async function removeOfflineBook(id: string): Promise<boolean> {
  try {
    const db = await openDB();
    const transaction = db.transaction(BOOKS_STORE, 'readwrite');
    const store = transaction.objectStore(BOOKS_STORE);
    store.delete(id);

    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve(true);
      transaction.onerror = () => reject(transaction.error);
    });
  } catch (error) {
    console.error('Failed to remove offline book:', error);
    return false;
  }
}

export async function isBookSavedOffline(id: string): Promise<boolean> {
  const book = await getOfflineBook(id);
  return book !== null && book.fileBlob !== undefined;
}

// Sync version for quick checks (uses cache)
let cachedBookIds: Set<string> = new Set();

export async function refreshCachedBookIds(): Promise<void> {
  const books = await getAllOfflineBooks();
  cachedBookIds = new Set(books.map(b => b.id));
}

export function isBookInCache(id: string): boolean {
  return cachedBookIds.has(id);
}

export async function clearAllSavedBooks(): Promise<void> {
  try {
    // Close the database connection first
    if (dbInstance) {
      dbInstance.close();
      dbInstance = null;
    }
    
    // Delete the entire database
    return new Promise((resolve, reject) => {
      const deleteRequest = indexedDB.deleteDatabase(DB_NAME);
      deleteRequest.onsuccess = () => {
        console.log('Books database deleted successfully');
        cachedBookIds.clear();
        resolve();
      };
      deleteRequest.onerror = () => {
        console.warn('Failed to delete books database:', deleteRequest.error);
        reject(deleteRequest.error);
      };
      deleteRequest.onblocked = () => {
        console.warn('Delete blocked - closing connections');
        resolve();
      };
    });
  } catch (error) {
    console.warn('Failed to clear saved books:', error);
  }
}

export async function getOfflineStorageSize(): Promise<string> {
  try {
    const books = await getAllOfflineBooks();
    let totalSize = 0;

    for (const savedBook of books) {
      if (savedBook.fileBlob) {
        totalSize += savedBook.fileBlob.size;
      }
      if (savedBook.coverBlob) {
        totalSize += savedBook.coverBlob.size;
      }
      // Estimate metadata size
      totalSize += JSON.stringify(savedBook.book).length;
    }

    if (totalSize < 1024) {
      return `${totalSize} بايت`;
    } else if (totalSize < 1024 * 1024) {
      return `${(totalSize / 1024).toFixed(1)} ك.ب`;
    } else {
      return `${(totalSize / (1024 * 1024)).toFixed(1)} م.ب`;
    }
  } catch {
    return '0 بايت';
  }
}

// React Hook for offline books
export function useOfflineBooks() {
  const [savedBooks, setSavedBooks] = useState<SavedBook[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [savingBookId, setSavingBookId] = useState<string | null>(null);

  const loadBooks = useCallback(async () => {
    setIsLoading(true);
    const books = await getAllOfflineBooks();
    setSavedBooks(books);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadBooks();
  }, [loadBooks]);

  const saveBook = useCallback(async (book: Book) => {
    setSavingBookId(book.id);
    toast.loading('جاري حفظ الكتاب للقراءة بدون إنترنت...', { id: `save-${book.id}` });

    try {
      const success = await saveBookOffline(book);
      if (success) {
        toast.success('تم حفظ الكتاب للقراءة بدون إنترنت', { id: `save-${book.id}` });
        await loadBooks();
      } else {
        toast.error('فشل في حفظ الكتاب', { id: `save-${book.id}` });
      }
    } catch (error) {
      toast.error('حدث خطأ أثناء الحفظ', { id: `save-${book.id}` });
    } finally {
      setSavingBookId(null);
    }
  }, [loadBooks]);

  const removeBook = useCallback(async (id: string) => {
    const success = await removeOfflineBook(id);
    if (success) {
      toast.success('تم حذف الكتاب من المحفوظات');
      await loadBooks();
    } else {
      toast.error('فشل في حذف الكتاب');
    }
  }, [loadBooks]);

  const isBookSaved = useCallback((id: string) => {
    return savedBooks.some(book => book.id === id);
  }, [savedBooks]);

  const getBookFileUrl = useCallback((id: string): string | null => {
    const savedBook = savedBooks.find(book => book.id === id);
    if (savedBook?.fileBlob) {
      return URL.createObjectURL(savedBook.fileBlob);
    }
    return null;
  }, [savedBooks]);

  const getBookCoverUrl = useCallback((id: string): string | null => {
    const savedBook = savedBooks.find(book => book.id === id);
    if (savedBook?.coverBlob) {
      return URL.createObjectURL(savedBook.coverBlob);
    }
    return null;
  }, [savedBooks]);

  return {
    savedBooks,
    isLoading,
    savingBookId,
    saveBook,
    removeBook,
    isBookSaved,
    getBookFileUrl,
    getBookCoverUrl,
    refreshBooks: loadBooks,
  };
}
