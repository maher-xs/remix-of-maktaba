/**
 * Image Compression Utility
 * Compresses images before upload to reduce file size and improve performance
 * Uses WebP format by default for better compression (30% smaller than JPEG)
 */

export interface CompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number; // 0 to 1
  mimeType?: 'image/jpeg' | 'image/webp' | 'image/png';
  preferWebP?: boolean;
}

/**
 * Check if browser supports WebP
 */
const supportsWebP = (): boolean => {
  const canvas = document.createElement('canvas');
  canvas.width = 1;
  canvas.height = 1;
  return canvas.toDataURL('image/webp').startsWith('data:image/webp');
};

// Cache WebP support check
let webPSupported: boolean | null = null;
const isWebPSupported = (): boolean => {
  if (webPSupported === null) {
    webPSupported = supportsWebP();
  }
  return webPSupported;
};

const DEFAULT_OPTIONS: CompressionOptions = {
  maxWidth: 1920,
  maxHeight: 1920,
  quality: 0.85,
  mimeType: 'image/webp',
  preferWebP: true
};

/**
 * Compress an image file
 * @param file - The image file to compress
 * @param options - Compression options
 * @returns Promise<File> - The compressed image file
 */
export const compressImage = async (
  file: File,
  options: CompressionOptions = {}
): Promise<File> => {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  
  // Use WebP if supported and preferred, otherwise fallback to JPEG
  if (opts.preferWebP && isWebPSupported()) {
    opts.mimeType = 'image/webp';
  } else if (opts.mimeType === 'image/webp' && !isWebPSupported()) {
    opts.mimeType = 'image/jpeg';
  }
  
  // Skip compression for small files (under 50KB)
  if (file.size < 50 * 1024) {
    return file;
  }

  // Skip compression for GIFs to preserve animation
  if (file.type === 'image/gif') {
    return file;
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      reject(new Error('Canvas context not available'));
      return;
    }

    img.onload = function(this: HTMLImageElement) {
      URL.revokeObjectURL(img.src);
      
      // Calculate new dimensions while maintaining aspect ratio
      let width = this.width;
      let height = this.height;
      const maxWidth = opts.maxWidth!;
      const maxHeight = opts.maxHeight!;

      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      canvas.width = width;
      canvas.height = height;

      // Use better quality settings
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      // Draw the image
      ctx.drawImage(this, 0, 0, width, height);

      // Convert to blob
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Failed to compress image'));
            return;
          }

          // If compressed file is larger than original, return original
          if (blob.size >= file.size) {
            resolve(file);
            return;
          }

          // Determine file extension based on mime type
          const ext = opts.mimeType === 'image/webp' ? 'webp' : 
                      opts.mimeType === 'image/png' ? 'png' : 'jpg';

          // Create new file with compressed data
          const compressedFile = new File(
            [blob],
            file.name.replace(/\.[^.]+$/, `.${ext}`),
            { type: opts.mimeType, lastModified: Date.now() }
          );

          const savedPercent = Math.round((1 - compressedFile.size / file.size) * 100);
          console.log(
            `Image compressed to ${ext.toUpperCase()}: ${formatBytes(file.size)} → ${formatBytes(compressedFile.size)} (${savedPercent}% reduction)`
          );

          resolve(compressedFile);
        },
        opts.mimeType,
        opts.quality
      );
    };

    img.onerror = () => {
      reject(new Error('Failed to load image for compression'));
    };

    // Create object URL and load image
    img.src = URL.createObjectURL(file);
  });
};

/**
 * Compress image for book covers (optimized for display)
 * Uses WebP for ~30% better compression than JPEG
 */
export const compressBookCover = (file: File): Promise<File> => {
  return compressImage(file, {
    maxWidth: 800,
    maxHeight: 1200,
    quality: 0.85,
    preferWebP: true
  });
};

/**
 * Compress image for avatars (smaller size)
 * Uses WebP for better quality at smaller file sizes
 */
export const compressAvatar = (file: File): Promise<File> => {
  return compressImage(file, {
    maxWidth: 400,
    maxHeight: 400,
    quality: 0.85,
    preferWebP: true
  });
};

/**
 * Compress image for reading list covers
 */
export const compressListCover = (file: File): Promise<File> => {
  return compressImage(file, {
    maxWidth: 600,
    maxHeight: 600,
    quality: 0.85,
    preferWebP: true
  });
};

/**
 * Format bytes to human readable string
 */
const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * Check if file needs compression
 */
export const needsCompression = (file: File): boolean => {
  // Compress if file is larger than 50KB and is a compressible format
  return (
    file.size > 50 * 1024 &&
    ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(file.type)
  );
};

/**
 * Check if WebP is supported in current browser
 */
export const isWebPAvailable = (): boolean => isWebPSupported();
