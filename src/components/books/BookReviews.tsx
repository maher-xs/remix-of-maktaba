import { useState } from 'react';
import { Star, Trash2, Edit2, Send, User, Flag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useBookReviews } from '@/hooks/useBookReviews';
import { useAuth } from '@/hooks/useAuth';
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';
import { Link } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';
import { ReportButton } from '@/components/reports/ReportButton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface BookReviewsProps {
  bookId: string;
}

const StarRating = ({ 
  rating, 
  onRate, 
  readonly = false,
  size = 'md'
}: { 
  rating: number; 
  onRate?: (rating: number) => void;
  readonly?: boolean;
  size?: 'sm' | 'md' | 'lg';
}) => {
  const [hovered, setHovered] = useState(0);
  
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };

  return (
    <div className="flex items-center gap-0.5" dir="ltr">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={readonly}
          onClick={() => onRate?.(star)}
          onMouseEnter={() => !readonly && setHovered(star)}
          onMouseLeave={() => setHovered(0)}
          className={`transition-colors ${readonly ? 'cursor-default' : 'cursor-pointer hover:scale-110'}`}
        >
          <Star
            className={`${sizeClasses[size]} transition-colors ${
              star <= (hovered || rating)
                ? 'fill-amber-400 text-amber-400'
                : 'text-muted-foreground/30'
            }`}
          />
        </button>
      ))}
    </div>
  );
};

const ReviewForm = ({ 
  bookId, 
  existingReview,
  onCancel
}: { 
  bookId: string;
  existingReview?: {
    rating: number;
    review_text: string | null;
  };
  onCancel?: () => void;
}) => {
  const [rating, setRating] = useState(existingReview?.rating || 0);
  const [reviewText, setReviewText] = useState(existingReview?.review_text || '');
  const { submitReview, isSubmitting } = useBookReviews(bookId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0) return;
    submitReview({ rating, reviewText });
    if (!existingReview) {
      setRating(0);
      setReviewText('');
    }
    onCancel?.();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground block text-center sm:text-right">تقييمك</label>
        <div className="flex justify-center sm:justify-start">
          <StarRating rating={rating} onRate={setRating} size="lg" />
        </div>
      </div>
      
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground block text-center sm:text-right">مراجعتك (اختياري)</label>
        <Textarea
          value={reviewText}
          onChange={(e) => setReviewText(e.target.value)}
          placeholder="شاركنا رأيك في هذا الكتاب..."
          className="min-h-[100px] resize-none text-right"
          maxLength={1000}
        />
        <p className="text-xs text-muted-foreground text-left">{reviewText.length}/1000</p>
      </div>
      
      <div className="flex items-center gap-2 justify-center sm:justify-start">
        <Button 
          type="submit" 
          disabled={rating === 0 || isSubmitting}
          className="gap-2"
        >
          <Send className="w-4 h-4" />
          {existingReview ? 'تحديث التقييم' : 'إرسال التقييم'}
        </Button>
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            إلغاء
          </Button>
        )}
      </div>
    </form>
  );
};

const ReviewCard = ({ 
  review, 
  isOwner,
  bookId
}: { 
  review: {
    id: string;
    rating: number;
    review_text: string | null;
    created_at: string;
    profiles?: {
      full_name: string | null;
      username: string | null;
      avatar_url: string | null;
    };
  };
  isOwner: boolean;
  bookId: string;
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const { deleteReview, isDeleting } = useBookReviews(bookId);

  if (isEditing) {
    return (
      <div className="p-4 bg-muted/50 rounded-xl border border-border">
        <ReviewForm 
          bookId={bookId} 
          existingReview={{ rating: review.rating, review_text: review.review_text }}
          onCancel={() => setIsEditing(false)}
        />
      </div>
    );
  }

  return (
    <div className="p-4 bg-muted/30 rounded-xl border border-border/50">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={review.profiles?.avatar_url || undefined} />
            <AvatarFallback className="bg-primary/10 text-primary">
              {review.profiles?.full_name?.charAt(0) || <User className="w-4 h-4" />}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium text-foreground">
              {review.profiles?.full_name || review.profiles?.username || 'مستخدم'}
            </p>
            <div className="flex items-center gap-2">
              <StarRating rating={review.rating} readonly size="sm" />
              <span className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(review.created_at), { addSuffix: true, locale: ar })}
              </span>
            </div>
          </div>
        </div>
        
        {isOwner && (
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              onClick={() => setIsEditing(true)}
            >
              <Edit2 className="w-4 h-4" />
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  disabled={isDeleting}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>حذف التقييم</AlertDialogTitle>
                  <AlertDialogDescription>
                    هل أنت متأكد من حذف تقييمك؟ لا يمكن التراجع عن هذا الإجراء.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>إلغاء</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => deleteReview()}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    حذف
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}
        
        {/* Report button for non-owners */}
        {!isOwner && (
          <ReportButton 
            contentType="review" 
            contentId={review.id} 
            variant="icon"
          />
        )}
      </div>
      
      {review.review_text && (
        <p className="mt-3 text-muted-foreground leading-relaxed">
          {review.review_text}
        </p>
      )}
    </div>
  );
};

const BookReviews = ({ bookId }: BookReviewsProps) => {
  const { user } = useAuth();
  const { reviews, reviewsLoading, rating, userReview } = useBookReviews(bookId);

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Rating Summary */}
      <div className="p-4 sm:p-6 bg-muted/30 rounded-xl border border-border/50">
        <div className="flex flex-col items-center text-center">
          <div className="text-4xl sm:text-5xl font-bold text-foreground mb-2">
            {rating?.average_rating?.toFixed(1) || '—'}
          </div>
          <StarRating rating={Math.round(rating?.average_rating || 0)} readonly size="md" />
          <p className="text-sm text-muted-foreground mt-2">
            {rating?.total_reviews || 0} تقييم
          </p>
        </div>
      </div>

      {/* Add Review Form */}
      {user ? (
        !userReview ? (
          <div className="p-4 sm:p-6 bg-muted/50 rounded-xl border border-border">
            <h3 className="font-bold text-foreground mb-4 text-center sm:text-right">أضف تقييمك</h3>
            <ReviewForm bookId={bookId} />
          </div>
        ) : null
      ) : (
        <div className="p-4 sm:p-6 bg-muted/30 rounded-xl border border-border/50 text-center">
          <p className="text-muted-foreground mb-3">سجل دخولك لإضافة تقييم</p>
          <Button asChild variant="outline">
            <Link to="/auth">تسجيل الدخول</Link>
          </Button>
        </div>
      )}

      {/* Reviews List */}
      <div className="space-y-3">
        <h3 className="font-bold text-foreground text-center sm:text-right">
          التقييمات ({reviews.length})
        </h3>
        
        {reviewsLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="p-4 bg-muted/30 rounded-xl">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                </div>
                <Skeleton className="h-16 w-full mt-3" />
              </div>
            ))}
          </div>
        ) : reviews.length === 0 ? (
          <p className="text-center text-muted-foreground py-6 sm:py-8 text-sm sm:text-base">
            لا توجد تقييمات بعد. كن أول من يقيّم هذا الكتاب!
          </p>
        ) : (
          <div className="space-y-3">
            {reviews.map((review) => (
              <ReviewCard
                key={review.id}
                review={review}
                isOwner={review.user_id === user?.id}
                bookId={bookId}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default BookReviews;
