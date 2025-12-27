import { useState, useEffect, useCallback } from 'react';

const DB_NAME = 'maktaba-offline-db';
const DB_VERSION = 1;
const STORE_NAME = 'offline-data';

interface OfflineData {
  key: string;
  data: any;
  timestamp: number;
  expiresAt?: number;
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
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'key' });
      }
    };
  });
}

export async function saveOfflineData(key: string, data: any, ttlMinutes?: number): Promise<void> {
  try {
    const db = await openDB();
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    const offlineData: OfflineData = {
      key,
      data,
      timestamp: Date.now(),
      expiresAt: ttlMinutes ? Date.now() + ttlMinutes * 60 * 1000 : undefined,
    };

    store.put(offlineData);

    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  } catch (error) {
    console.warn('Failed to save offline data:', error);
  }
}

export async function getOfflineData<T>(key: string): Promise<T | null> {
  try {
    const db = await openDB();
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(key);

    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        const result = request.result as OfflineData | undefined;
        if (!result) {
          resolve(null);
          return;
        }

        // Check if expired
        if (result.expiresAt && Date.now() > result.expiresAt) {
          deleteOfflineData(key);
          resolve(null);
          return;
        }

        resolve(result.data as T);
      };
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.warn('Failed to get offline data:', error);
    return null;
  }
}

export async function deleteOfflineData(key: string): Promise<void> {
  try {
    const db = await openDB();
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    store.delete(key);

    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  } catch (error) {
    console.warn('Failed to delete offline data:', error);
  }
}

export async function clearAllOfflineData(): Promise<void> {
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
        console.log('Offline database deleted successfully');
        resolve();
      };
      deleteRequest.onerror = () => {
        console.warn('Failed to delete offline database:', deleteRequest.error);
        reject(deleteRequest.error);
      };
      deleteRequest.onblocked = () => {
        console.warn('Delete blocked - closing connections');
        resolve();
      };
    });
  } catch (error) {
    console.warn('Failed to clear offline data:', error);
  }
}

// Hook for using offline storage with React
export function useOfflineData<T>(key: string, initialValue: T) {
  const [data, setData] = useState<T>(initialValue);
  const [isLoading, setIsLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    getOfflineData<T>(key).then((storedData) => {
      if (storedData !== null) {
        setData(storedData);
      }
      setIsLoading(false);
    });
  }, [key]);

  const saveData = useCallback(async (newData: T, ttlMinutes?: number) => {
    setData(newData);
    await saveOfflineData(key, newData, ttlMinutes);
  }, [key]);

  return { data, saveData, isLoading, isOnline };
}

// Hook for detecting online status
export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}
