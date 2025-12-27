import { useState, useRef, useEffect, memo, useMemo } from 'react';
import { cn } from '@/lib/utils';

interface LazyImageProps {
  src: string;
  alt: string;
  className?: string;
  placeholderClassName?: string;
  onLoad?: () => void;
  onError?: () => void;
  priority?: boolean; // For above-the-fold images
  width?: number;
  height?: number;
  quality?: number;
}

// Helper to optimize Supabase storage URLs
const getOptimizedUrl = (src: string, width?: number, height?: number, quality = 75): string => {
  if (!src) return src;
  
  // Check if it's a Supabase storage URL
  const isSupabaseStorage = src.includes('supabase.co/storage') || src.includes('/storage/v1/object');
  
  if (isSupabaseStorage && (width || height)) {
    const url = new URL(src);
    const params = new URLSearchParams();
    
    if (width) params.set('width', String(width));
    if (height) params.set('height', String(height));
    params.set('quality', String(quality));
    params.set('format', 'webp');
    
    // Transform URL to use render endpoint
    const transformedUrl = src.replace('/object/public/', '/render/image/public/');
    return `${transformedUrl}?${params.toString()}`;
  }
  
  return src;
};

// Generate blur data URL placeholder
const generateBlurPlaceholder = (color = 'hsl(var(--muted))'): string => {
  return `data:image/svg+xml;charset=utf-8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"><rect fill="${encodeURIComponent(color)}" width="1" height="1"/></svg>`;
};

const LazyImage = memo(({
  src,
  alt,
  className,
  placeholderClassName,
  onLoad,
  onError,
  priority = false,
  width,
  height,
  quality = 75,
}: LazyImageProps) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(priority); // Priority images load immediately
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  // Optimize the image URL
  const optimizedSrc = useMemo(() => 
    getOptimizedUrl(src, width, height, quality), 
    [src, width, height, quality]
  );

  // Generate srcset for responsive images
  const srcSet = useMemo(() => {
    if (!src || hasError) return undefined;
    
    const isSupabaseStorage = src.includes('supabase.co/storage') || src.includes('/storage/v1/object');
    if (!isSupabaseStorage) return undefined;

    const sizes = [320, 640, 768, 1024, 1280];
    return sizes
      .map(w => `${getOptimizedUrl(src, w, undefined, quality)} ${w}w`)
      .join(', ');
  }, [src, quality, hasError]);

  useEffect(() => {
    // Priority images don't need intersection observer
    if (priority || !imgRef.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      {
        rootMargin: '200px', // Start loading 200px before entering viewport
        threshold: 0.01,
      }
    );

    observer.observe(imgRef.current);

    return () => observer.disconnect();
  }, [priority]);

  // Preload priority images
  useEffect(() => {
    if (priority && optimizedSrc) {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'image';
      link.href = optimizedSrc;
      link.fetchPriority = 'high';
      document.head.appendChild(link);
      
      return () => {
        document.head.removeChild(link);
      };
    }
  }, [priority, optimizedSrc]);

  const handleLoad = () => {
    setIsLoaded(true);
    onLoad?.();
  };

  const handleError = () => {
    setHasError(true);
    onError?.();
  };

  return (
    <div className="relative w-full h-full">
      {/* Blur placeholder */}
      {!isLoaded && !hasError && (
        <div 
          className={cn(
            "absolute inset-0 animate-pulse bg-muted/70 backdrop-blur-sm",
            placeholderClassName
          )}
          style={{
            backgroundImage: `url("${generateBlurPlaceholder()}")`,
            backgroundSize: 'cover',
          }}
        />
      )}
      
      <img
        ref={imgRef}
        src={isInView ? optimizedSrc : undefined}
        srcSet={isInView ? srcSet : undefined}
        sizes={srcSet ? "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw" : undefined}
        data-src={optimizedSrc}
        alt={alt}
        width={width}
        height={height}
        className={cn(
          "transition-opacity duration-300 ease-out",
          isLoaded ? "opacity-100" : "opacity-0",
          className
        )}
        loading={priority ? "eager" : "lazy"}
        decoding="async"
        fetchPriority={priority ? "high" : "auto"}
        onLoad={handleLoad}
        onError={handleError}
      />
    </div>
  );
});

LazyImage.displayName = 'LazyImage';

export default LazyImage;

// Hook for preloading critical images
export const usePreloadImages = (urls: string[]) => {
  useEffect(() => {
    const links: HTMLLinkElement[] = [];
    
    urls.forEach(url => {
      if (url) {
        const link = document.createElement('link');
        link.rel = 'preload';
        link.as = 'image';
        link.href = url;
        document.head.appendChild(link);
        links.push(link);
      }
    });
    
    return () => {
      links.forEach(link => document.head.removeChild(link));
    };
  }, [urls]);
};
