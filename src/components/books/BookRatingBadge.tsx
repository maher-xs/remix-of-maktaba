import { Star } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface BookRatingBadgeProps {
  bookId: string;
  size?: 'sm' | 'md';
}

const BookRatingBadge = ({ bookId, size = 'sm' }: BookRatingBadgeProps) => {
  const { data: rating } = useQuery({
    queryKey: ['book-rating', bookId],
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc('get_book_rating', { p_book_id: bookId });

      if (error) throw error;
      return data?.[0] || { average_rating: null, total_reviews: 0 };
    },
    enabled: !!bookId,
    staleTime: 1000 * 60 * 5,
  });

  if (!rating?.average_rating || rating.total_reviews === 0) {
    return null;
  }

  const sizeClasses = {
    sm: 'text-xs px-1.5 py-0.5 gap-0.5',
    md: 'text-sm px-2 py-1 gap-1',
  };

  const starSize = size === 'sm' ? 'w-3 h-3' : 'w-4 h-4';

  return (
    <div className={`flex items-center bg-amber-500/20 text-amber-600 dark:text-amber-400 rounded-md font-medium ${sizeClasses[size]}`}>
      <Star className={`${starSize} fill-current`} />
      <span>{rating.average_rating.toFixed(1)}</span>
    </div>
  );
};

export default BookRatingBadge;
