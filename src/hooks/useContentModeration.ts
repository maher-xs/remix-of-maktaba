import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { 
  checkTextForProfanity, 
  validateBookContent, 
  validateProfileContent,
  validateReviewContent,
  validateReadingListContent,
  ModerationResult 
} from '@/lib/contentModeration';
import { toast } from 'sonner';

interface ImageModerationResult {
  isSafe: boolean;
  category: string;
  confidence: number;
  message: string;
}

// Log moderation violation to database
async function logModerationViolation(
  contentType: string,
  contentField: string | null,
  originalContent: string | null,
  flaggedWords: string[],
  severity: string,
  actionTaken: string = 'blocked'
) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    await supabase.from('content_moderation_logs').insert({
      user_id: user?.id || null,
      content_type: contentType,
      content_field: contentField,
      original_content: originalContent?.substring(0, 500), // Limit content length
      flagged_words: flaggedWords,
      severity,
      action_taken: actionTaken,
    });
  } catch (error) {
    console.error('Failed to log moderation violation:', error);
  }
}

export function useContentModeration() {
  const [isChecking, setIsChecking] = useState(false);

  // Check text content
  const moderateText = (text: string): ModerationResult => {
    return checkTextForProfanity(text);
  };

  // Check book content (title, description, author, publisher)
  const moderateBook = (data: {
    title?: string;
    description?: string;
    author?: string;
    publisher?: string;
  }): ModerationResult => {
    const result = validateBookContent(data);
    
    // Log violation if content is not clean
    if (!result.isClean) {
      const content = [data.title, data.description, data.author, data.publisher].filter(Boolean).join(' | ');
      logModerationViolation('book', 'title/description/author/publisher', content, result.flaggedWords, result.severity);
    }
    
    return result;
  };

  // Check profile content
  const moderateProfile = (data: {
    fullName?: string;
    username?: string;
    bio?: string;
  }): ModerationResult => {
    const result = validateProfileContent(data);
    
    if (!result.isClean) {
      const content = [data.fullName, data.username, data.bio].filter(Boolean).join(' | ');
      logModerationViolation('profile', 'fullName/username/bio', content, result.flaggedWords, result.severity);
    }
    
    return result;
  };

  // Check review content
  const moderateReview = (text: string): ModerationResult => {
    const result = validateReviewContent(text);
    
    if (!result.isClean) {
      logModerationViolation('review', 'review_text', text, result.flaggedWords, result.severity);
    }
    
    return result;
  };

  // Check reading list content
  const moderateReadingList = (data: {
    name?: string;
    description?: string;
  }): ModerationResult => {
    const result = validateReadingListContent(data);
    
    if (!result.isClean) {
      const content = [data.name, data.description].filter(Boolean).join(' | ');
      logModerationViolation('reading_list', 'name/description', content, result.flaggedWords, result.severity);
    }
    
    return result;
  };

  // Check image using AI
  const moderateImage = async (
    imageSource: string | File
  ): Promise<ImageModerationResult> => {
    setIsChecking(true);

    try {
      let payload: { imageUrl?: string; imageBase64?: string } = {};

      if (typeof imageSource === 'string') {
        payload.imageUrl = imageSource;
      } else {
        const base64 = await fileToBase64(imageSource);
        payload.imageBase64 = base64;
      }

      const { data, error } = await supabase.functions.invoke('moderate-image', {
        body: payload
      });

      if (error) {
        console.error('Image moderation error:', error);
        return {
          isSafe: true,
          category: 'unknown',
          confidence: 0,
          message: 'لم يتم التحقق من الصورة'
        };
      }

      const result = data as ImageModerationResult;
      
      // Log if image is not safe
      if (!result.isSafe) {
        logModerationViolation(
          'image', 
          'cover/avatar', 
          `Category: ${result.category}`, 
          [result.category], 
          'high'
        );
      }

      return result;
    } catch (error) {
      console.error('Image moderation failed:', error);
      return {
        isSafe: true,
        category: 'error',
        confidence: 0,
        message: 'لم يتم التحقق من الصورة'
      };
    } finally {
      setIsChecking(false);
    }
  };

  // Validate and show toast if content is inappropriate
  const validateWithToast = (
    result: ModerationResult,
    context: string = 'المحتوى'
  ): boolean => {
    if (!result.isClean) {
      toast.error(`${context} يحتوي على كلمات غير لائقة`, {
        description: result.message
      });
      return false;
    }
    return true;
  };

  // Validate image and show toast
  const validateImageWithToast = async (
    imageSource: string | File,
    context: string = 'الصورة'
  ): Promise<boolean> => {
    const result = await moderateImage(imageSource);
    
    if (!result.isSafe) {
      toast.error(`${context} غير مناسبة`, {
        description: result.message
      });
      return false;
    }
    return true;
  };

  return {
    isChecking,
    moderateText,
    moderateBook,
    moderateProfile,
    moderateReview,
    moderateReadingList,
    moderateImage,
    validateWithToast,
    validateImageWithToast
  };
}

// Helper function to convert File to base64
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
}
