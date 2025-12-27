import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';
import { validateReviewContent } from '@/lib/contentModeration';

interface Review {
  id: string;
  book_id: string;
  user_id: string;
  rating: number;
  review_text: string | null;
  created_at: string;
  updated_at: string;
  profiles?: {
    full_name: string | null;
    username: string | null;
    avatar_url: string | null;
  };
}

interface BookRating {
  average_rating: number | null;
  total_reviews: number;
}

export const useBookReviews = (bookId: string) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch all reviews for a book
  const { data: reviews = [], isLoading: reviewsLoading } = useQuery({
    queryKey: ['book-reviews', bookId],
    queryFn: async (): Promise<Review[]> => {
      // First get reviews
      const { data: reviewsData, error: reviewsError } = await supabase
        .from('book_reviews')
        .select('*')
        .eq('book_id', bookId)
        .order('created_at', { ascending: false });

      if (reviewsError) throw reviewsError;
      if (!reviewsData || reviewsData.length === 0) return [];

      // Get unique user IDs
      const userIds = [...new Set(reviewsData.map(r => r.user_id))];

      // Fetch profiles for those users
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, full_name, username, avatar_url')
        .in('id', userIds);

      // Map profiles to reviews
      const profilesMap = new Map(profilesData?.map(p => [p.id, p]) || []);

      return reviewsData.map(review => ({
        ...review,
        profiles: profilesMap.get(review.user_id) || undefined,
      }));
    },
    enabled: !!bookId,
  });

  // Fetch book rating stats
  const { data: rating } = useQuery({
    queryKey: ['book-rating', bookId],
    queryFn: async (): Promise<BookRating> => {
      const { data, error } = await supabase
        .rpc('get_book_rating', { p_book_id: bookId });

      if (error) throw error;
      return data?.[0] || { average_rating: null, total_reviews: 0 };
    },
    enabled: !!bookId,
  });

  // Get user's own review
  const userReview = reviews.find(r => r.user_id === user?.id);

  // Add or update review
  const { mutate: submitReview, isPending: isSubmitting } = useMutation({
    mutationFn: async ({ rating, reviewText }: { rating: number; reviewText: string }) => {
      if (!user) throw new Error('يجب تسجيل الدخول');

      // 🔐 Content moderation - check for profanity
      if (reviewText) {
        const contentCheck = validateReviewContent(reviewText);
        if (!contentCheck.isClean) {
          throw new Error('يحتوي التقييم على كلمات غير لائقة. يرجى تعديل النص.');
        }
      }

      if (userReview) {
        // Update existing review
        const { error } = await supabase
          .from('book_reviews')
          .update({
            rating,
            review_text: reviewText || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', userReview.id);

        if (error) throw error;
      } else {
        // Insert new review
        const { error } = await supabase
          .from('book_reviews')
          .insert({
            book_id: bookId,
            user_id: user.id,
            rating,
            review_text: reviewText || null,
          });

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['book-reviews', bookId] });
      queryClient.invalidateQueries({ queryKey: ['book-rating', bookId] });
      toast.success(userReview ? 'تم تحديث تقييمك' : 'تم إضافة تقييمك');
    },
    onError: (error) => {
      console.error('Review error:', error);
      toast.error('حدث خطأ أثناء حفظ التقييم');
    },
  });

  // Delete review
  const { mutate: deleteReview, isPending: isDeleting } = useMutation({
    mutationFn: async () => {
      if (!userReview) throw new Error('لا يوجد تقييم لحذفه');

      const { error } = await supabase
        .from('book_reviews')
        .delete()
        .eq('id', userReview.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['book-reviews', bookId] });
      queryClient.invalidateQueries({ queryKey: ['book-rating', bookId] });
      toast.success('تم حذف تقييمك');
    },
    onError: (error) => {
      console.error('Delete review error:', error);
      toast.error('حدث خطأ أثناء حذف التقييم');
    },
  });

  return {
    reviews,
    reviewsLoading,
    rating,
    userReview,
    submitReview,
    isSubmitting,
    deleteReview,
    isDeleting,
  };
};
