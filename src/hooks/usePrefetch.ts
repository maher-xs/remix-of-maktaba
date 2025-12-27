import { useCallback } from 'react';

// Map of routes to their lazy import functions
const routeImports: Record<string, () => Promise<unknown>> = {
  '/': () => import('@/pages/Index'),
  '/categories': () => import('@/pages/Categories'),
  '/search': () => import('@/pages/Search'),
  '/favorites': () => import('@/pages/Favorites'),
  '/my-library': () => import('@/pages/MyLibrary'),
  '/profile': () => import('@/pages/Profile'),
  '/auth': () => import('@/pages/Auth'),
  '/about': () => import('@/pages/About'),
  '/contact': () => import('@/pages/Contact'),
  '/upload': () => import('@/pages/UploadBook'),
  '/admin': () => import('@/pages/admin/AdminDashboard'),
  '/admin/books': () => import('@/pages/admin/AdminBooks'),
  '/admin/users': () => import('@/pages/admin/AdminUsers'),
  '/admin/categories': () => import('@/pages/admin/AdminCategories'),
};

// Cache to track what's already been prefetched
const prefetchedRoutes = new Set<string>();

export const usePrefetch = () => {
  const prefetch = useCallback((path: string) => {
    // Normalize path
    const normalizedPath = path.split('?')[0].split('#')[0];
    
    // Check if already prefetched
    if (prefetchedRoutes.has(normalizedPath)) return;
    
    // Check if we have an import for this route
    const importFn = routeImports[normalizedPath];
    if (importFn) {
      prefetchedRoutes.add(normalizedPath);
      // Prefetch with low priority
      requestIdleCallback(() => {
        importFn().catch(() => {
          // Silently fail - prefetching is just an optimization
          prefetchedRoutes.delete(normalizedPath);
        });
      });
    }
  }, []);

  const prefetchOnHover = useCallback((path: string) => {
    return {
      onMouseEnter: () => prefetch(path),
      onFocus: () => prefetch(path),
    };
  }, [prefetch]);

  return { prefetch, prefetchOnHover };
};

// Prefetch common routes on app load
export const prefetchCommonRoutes = () => {
  if (typeof window === 'undefined') return;
  
  // Wait for the app to be idle before prefetching
  requestIdleCallback(() => {
    const commonRoutes = ['/', '/categories', '/search'];
    commonRoutes.forEach(route => {
      const importFn = routeImports[route];
      if (importFn && !prefetchedRoutes.has(route)) {
        prefetchedRoutes.add(route);
        importFn().catch(() => prefetchedRoutes.delete(route));
      }
    });
  });
};

// Polyfill for requestIdleCallback
if (typeof window !== 'undefined' && !window.requestIdleCallback) {
  window.requestIdleCallback = (callback: IdleRequestCallback): number => {
    return window.setTimeout(() => callback({ didTimeout: false, timeRemaining: () => 50 }), 1) as unknown as number;
  };
}
