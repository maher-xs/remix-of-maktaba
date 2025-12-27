import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { 
  validatePdfFile, 
  validateImageFile, 
  checkUploadRateLimit,
  sanitizeFileName 
} from '@/lib/fileSecurityUtils';
import { 
  compressImage, 
  compressBookCover, 
  compressAvatar, 
  compressListCover,
  needsCompression 
} from '@/lib/imageCompression';
import { toast } from 'sonner';

interface UploadOptions {
  bucket: 'maktaba' | 'avatars' | 'reading-list-covers';
  folder?: string;
  maxSizeMB?: number;
  onProgress?: (progress: number) => void;
  skipCompression?: boolean;
}

interface UploadResult {
  success: boolean;
  url?: string;
  error?: string;
  fileName?: string;
  originalSize?: number;
  compressedSize?: number;
}

export const useSecureUpload = () => {
  const { user } = useAuth();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  /**
   * Securely upload a PDF file
   */
  const uploadPdf = useCallback(async (
    file: File,
    options: Omit<UploadOptions, 'bucket'> = {}
  ): Promise<UploadResult> => {
    if (!user) {
      return { success: false, error: 'يجب تسجيل الدخول أولاً' };
    }

    // Check rate limit
    const rateLimit = checkUploadRateLimit(user.id, 10, 3600000); // 10 uploads per hour
    if (!rateLimit.allowed) {
      const minutesLeft = Math.ceil(rateLimit.resetIn / 60000);
      return { 
        success: false, 
        error: `تم تجاوز الحد الأقصى للرفع. حاول مرة أخرى بعد ${minutesLeft} دقيقة` 
      };
    }

    // Validate file
    const validation = await validatePdfFile(file);
    if (!validation.isValid) {
      return { success: false, error: validation.error };
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const sanitizedName = validation.sanitizedName || sanitizeFileName(file.name);
      const folder = options.folder || user.id;
      const filePath = `${folder}/${Date.now()}_${sanitizedName}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('maktaba')
        .upload(filePath, file, {
          upsert: false,
          contentType: 'application/pdf'
        });

      if (uploadError) {
        throw uploadError;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('maktaba')
        .getPublicUrl(filePath);

      setUploadProgress(100);

      return {
        success: true,
        url: publicUrl,
        fileName: sanitizedName
      };
    } catch (error: any) {
      console.error('Upload error:', error);
      return {
        success: false,
        error: error.message || 'حدث خطأ أثناء رفع الملف'
      };
    } finally {
      setIsUploading(false);
    }
  }, [user]);

  /**
   * Securely upload an image with automatic compression
   */
  const uploadImage = useCallback(async (
    file: File,
    options: UploadOptions
  ): Promise<UploadResult> => {
    if (!user) {
      return { success: false, error: 'يجب تسجيل الدخول أولاً' };
    }

    // Check rate limit
    const rateLimit = checkUploadRateLimit(user.id, 20, 3600000); // 20 images per hour
    if (!rateLimit.allowed) {
      const minutesLeft = Math.ceil(rateLimit.resetIn / 60000);
      return { 
        success: false, 
        error: `تم تجاوز الحد الأقصى للرفع. حاول مرة أخرى بعد ${minutesLeft} دقيقة` 
      };
    }

    // Validate file
    const validation = await validateImageFile(file);
    if (!validation.isValid) {
      return { success: false, error: validation.error };
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const originalSize = file.size;
      let fileToUpload = file;

      // Compress image if needed and not skipped
      if (!options.skipCompression && needsCompression(file)) {
        setUploadProgress(10);
        
        // Use appropriate compression based on bucket type
        if (options.bucket === 'avatars') {
          fileToUpload = await compressAvatar(file);
        } else if (options.bucket === 'reading-list-covers') {
          fileToUpload = await compressListCover(file);
        } else {
          fileToUpload = await compressBookCover(file);
        }
        
        setUploadProgress(30);
        
        // Show compression result
        if (fileToUpload.size < originalSize) {
          const savedPercent = Math.round((1 - fileToUpload.size / originalSize) * 100);
          toast.success(`تم ضغط الصورة بنسبة ${savedPercent}%`);
        }
      }

      const sanitizedName = validation.sanitizedName || sanitizeFileName(file.name);
      const folder = options.folder || user.id;
      const filePath = `${folder}/${Date.now()}_${sanitizedName}`;

      setUploadProgress(50);

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from(options.bucket)
        .upload(filePath, fileToUpload, {
          upsert: options.bucket === 'avatars', // Allow upsert for avatars
          contentType: fileToUpload.type || validation.detectedType
        });

      if (uploadError) {
        throw uploadError;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from(options.bucket)
        .getPublicUrl(filePath);

      setUploadProgress(100);

      return {
        success: true,
        url: publicUrl,
        fileName: sanitizedName,
        originalSize,
        compressedSize: fileToUpload.size
      };
    } catch (error: any) {
      console.error('Upload error:', error);
      return {
        success: false,
        error: error.message || 'حدث خطأ أثناء رفع الصورة'
      };
    } finally {
      setIsUploading(false);
    }
  }, [user]);

  /**
   * Delete a file from storage
   */
  const deleteFile = useCallback(async (
    bucket: 'maktaba' | 'avatars',
    filePath: string
  ): Promise<{ success: boolean; error?: string }> => {
    if (!user) {
      return { success: false, error: 'يجب تسجيل الدخول أولاً' };
    }

    try {
      const { error } = await supabase.storage
        .from(bucket)
        .remove([filePath]);

      if (error) throw error;

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }, [user]);

  /**
   * Get user's storage usage
   */
  const getStorageUsage = useCallback(async (): Promise<{ 
    totalBytes: number; 
    fileCount: number;
    error?: string 
  }> => {
    if (!user) {
      return { totalBytes: 0, fileCount: 0, error: 'يجب تسجيل الدخول أولاً' };
    }

    try {
      const { data: files, error } = await supabase.storage
        .from('maktaba')
        .list(user.id);

      if (error) throw error;

      // Note: Supabase doesn't return file sizes in list, 
      // this would need a custom solution or edge function
      return {
        totalBytes: 0,
        fileCount: files?.length || 0
      };
    } catch (error: any) {
      return { totalBytes: 0, fileCount: 0, error: error.message };
    }
  }, [user]);

  return {
    uploadPdf,
    uploadImage,
    deleteFile,
    getStorageUsage,
    isUploading,
    uploadProgress
  };
};

export default useSecureUpload;
