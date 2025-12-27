import { useEffect, useCallback } from 'react';
import { useOnlineStatus } from './useOfflineStorage';

const DB_NAME = 'maktaba-data-cache';
const DB_VERSION = 1;

interface CacheStores {
  books: 'books';
  categories: 'categories';
  featuredBooks: 'featured-books';
  latestBooks: 'latest-books';
  booksByCategory: 'books-by-category';
}

const STORE_NAMES: CacheStores = {
  books: 'books',
  categories: 'categories',
  featuredBooks: 'featured-books',
  latestBooks: 'latest-books',
  booksByCategory: 'books-by-category',
};

let dbInstance: IDBDatabase | null = null;

async function openCacheDB(): Promise<IDBDatabase> {
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
      
      // Create object stores for different data types
      Object.values(STORE_NAMES).forEach(storeName => {
        if (!db.objectStoreNames.contains(storeName)) {
          db.createObjectStore(storeName, { keyPath: 'cacheKey' });
        }
      });
    };
  });
}

interface CachedData<T> {
  cacheKey: string;
  data: T;
  timestamp: number;
  expiresAt: number;
}

// Cache duration in minutes
const CACHE_DURATIONS = {
  books: 60, // 1 hour
  categories: 120, // 2 hours
  featuredBooks: 30, // 30 minutes
  latestBooks: 15, // 15 minutes
  booksByCategory: 60, // 1 hour
};

export async function cacheData<T>(
  storeName: string,
  key: string,
  data: T,
  ttlMinutes?: number
): Promise<void> {
  try {
    const db = await openCacheDB();
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);

    const ttl = ttlMinutes || 60; // Default 1 hour
    const cachedData: CachedData<T> = {
      cacheKey: key,
      data,
      timestamp: Date.now(),
      expiresAt: Date.now() + ttl * 60 * 1000,
    };

    store.put(cachedData);

    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  } catch (error) {
    console.warn('Failed to cache data:', error);
  }
}

export async function getCachedData<T>(
  storeName: string,
  key: string,
  ignoreExpiry = false
): Promise<T | null> {
  try {
    const db = await openCacheDB();
    const transaction = db.transaction(storeName, 'readonly');
    const store = transaction.objectStore(storeName);
    const request = store.get(key);

    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        const result = request.result as CachedData<T> | undefined;
        if (!result) {
          resolve(null);
          return;
        }

        // Check if expired (unless we're offline and ignoring expiry)
        if (!ignoreExpiry && Date.now() > result.expiresAt) {
          resolve(null);
          return;
        }

        resolve(result.data);
      };
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.warn('Failed to get cached data:', error);
    return null;
  }
}

export async function clearCacheStore(storeName: string): Promise<void> {
  try {
    const db = await openCacheDB();
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    store.clear();

    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  } catch (error) {
    console.warn('Failed to clear cache store:', error);
  }
}

export async function clearAllCache(): Promise<void> {
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
        console.log('Cache database deleted successfully');
        resolve();
      };
      deleteRequest.onerror = () => {
        console.warn('Failed to delete cache database:', deleteRequest.error);
        reject(deleteRequest.error);
      };
      deleteRequest.onblocked = () => {
        console.warn('Delete blocked - closing connections');
        resolve();
      };
    });
  } catch (error) {
    console.warn('Failed to clear all cache:', error);
  }
}

// Get cache size info
export async function getCacheInfo(): Promise<{
  totalSize: string;
  stores: { name: string; count: number }[];
}> {
  try {
    const db = await openCacheDB();
    const stores: { name: string; count: number }[] = [];
    
    for (const storeName of Object.values(STORE_NAMES)) {
      const transaction = db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const countRequest = store.count();
      
      await new Promise<void>((resolve) => {
        countRequest.onsuccess = () => {
          stores.push({ name: storeName, count: countRequest.result });
          resolve();
        };
        countRequest.onerror = () => resolve();
      });
    }

    // Estimate storage
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const estimate = await navigator.storage.estimate();
      const usedMB = ((estimate.usage || 0) / (1024 * 1024)).toFixed(2);
      return { totalSize: `${usedMB} MB`, stores };
    }

    return { totalSize: 'غير متاح', stores };
  } catch (error) {
    return { totalSize: 'غير متاح', stores: [] };
  }
}

// Hook for using cached data with online/offline support
export function useDataWithCache<T>(
  queryKey: string,
  storeName: string,
  fetchFn: () => Promise<T>,
  options?: {
    ttlMinutes?: number;
    enabled?: boolean;
  }
) {
  const isOnline = useOnlineStatus();
  const { ttlMinutes, enabled = true } = options || {};

  const fetchWithCache = useCallback(async (): Promise<T | null> => {
    // If offline, try to get from cache (ignore expiry)
    if (!isOnline) {
      const cached = await getCachedData<T>(storeName, queryKey, true);
      if (cached) return cached;
      return null;
    }

    // If online, fetch fresh data and cache it
    try {
      const data = await fetchFn();
      await cacheData(storeName, queryKey, data, ttlMinutes);
      return data;
    } catch (error) {
      // If fetch fails, try cache
      const cached = await getCachedData<T>(storeName, queryKey, true);
      if (cached) return cached;
      throw error;
    }
  }, [isOnline, queryKey, storeName, fetchFn, ttlMinutes]);

  return { fetchWithCache, isOnline };
}

// Pre-cache essential data when online
export async function preCacheEssentialData(
  fetchBooks: () => Promise<unknown>,
  fetchCategories: () => Promise<unknown>,
  fetchFeatured: () => Promise<unknown>,
  fetchLatest: () => Promise<unknown>
): Promise<void> {
  if (!navigator.onLine) return;

  try {
    const [books, categories, featured, latest] = await Promise.all([
      fetchBooks(),
      fetchCategories(),
      fetchFeatured(),
      fetchLatest(),
    ]);

    await Promise.all([
      cacheData(STORE_NAMES.books, 'all-books', books, CACHE_DURATIONS.books),
      cacheData(STORE_NAMES.categories, 'all-categories', categories, CACHE_DURATIONS.categories),
      cacheData(STORE_NAMES.featuredBooks, 'featured', featured, CACHE_DURATIONS.featuredBooks),
      cacheData(STORE_NAMES.latestBooks, 'latest', latest, CACHE_DURATIONS.latestBooks),
    ]);

    console.log('Essential data pre-cached successfully');
  } catch (error) {
    console.warn('Failed to pre-cache essential data:', error);
  }
}

export { STORE_NAMES, CACHE_DURATIONS };
