import { Link } from 'react-router-dom';
import { Download, Eye, Star } from 'lucide-react';
import { Book } from '@/hooks/useBooks';
import { useState, forwardRef, memo, useCallback } from 'react';
import { CATEGORY_ICON_MAP, getGradientStyle } from '@/lib/categoryIcons';
import { useIsMobile } from '@/hooks/use-mobile';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface BookCardProps {
  book: Book;
}

const BookCard = memo(forwardRef<HTMLAnchorElement, BookCardProps>(({ book }, ref) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const isMobile = useIsMobile();

  // Fetch book rating with longer cache (disabled on mobile for performance)
  const { data: rating } = useQuery({
    queryKey: ['book-rating', book.id],
    enabled: !isMobile,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_book_rating', { p_book_id: book.id });
      if (error) throw error;
      return data?.[0] || { average_rating: null, total_reviews: 0 };
    },
    staleTime: 1000 * 60 * 30, // Cache for 30 minutes
    gcTime: 1000 * 60 * 60, // Keep in cache for 1 hour
  });

  const handleImageLoad = useCallback(() => setImageLoaded(true), []);
  const handleImageError = useCallback(() => setImageError(true), []);
  const handleMouseEnter = useCallback(() => !isMobile && setIsHovered(true), [isMobile]);
  const handleMouseLeave = useCallback(() => !isMobile && setIsHovered(false), [isMobile]);

  // Generate a placeholder gradient based on book title
  const getPlaceholderGradient = (title: string) => {
    const colors = [
      'from-emerald-600 to-emerald-800',
      'from-amber-500 to-amber-700',
      'from-blue-600 to-blue-800',
      'from-purple-600 to-purple-800',
      'from-rose-600 to-rose-800',
      'from-cyan-600 to-cyan-800',
    ];
    const index = title.charCodeAt(0) % colors.length;
    return colors[index];
  };

  // Get category icon
  const getCategoryIcon = () => {
    if (!book.category) return null;
    const IconComponent = CATEGORY_ICON_MAP[book.category.icon || 'book'] || CATEGORY_ICON_MAP['book'];
    return <IconComponent className="w-3 h-3" />;
  };

  // Disable hover effects on mobile
  const showHoverEffects = !isMobile && isHovered;

  return (
    <Link
      ref={ref}
      to={`/book/${book.id}`}
      className="block group h-full will-change-transform touch-manipulation tap-highlight"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div
        className="relative bg-card rounded-xl sm:rounded-2xl border border-border/50 overflow-hidden h-full flex flex-col transition-all duration-200 active:scale-[0.98]"
        style={{
          boxShadow: showHoverEffects
            ? '0 16px 32px -8px hsl(var(--foreground) / 0.1)'
            : '0 2px 8px hsl(var(--foreground) / 0.04)',
        }}
      >
        {/* Cover Image - Fixed aspect ratio for consistency */}
        <div className="relative aspect-[3/4] overflow-hidden bg-muted flex-shrink-0">
          {!imageLoaded && !imageError && (
            <div className="absolute inset-0 skeleton" />
          )}

          {imageError || !book.cover_url ? (
            <div
              className={`absolute inset-0 bg-gradient-to-br ${getPlaceholderGradient(book.title)} flex items-center justify-center p-3`}
            >
              <span className="text-white text-center font-bold text-xs sm:text-sm line-clamp-3">
                {book.title}
              </span>
            </div>
          ) : (
            <img
              src={book.cover_url}
              alt={`غلاف كتاب ${book.title}`}
              className={`w-full h-full object-cover transition-all duration-300 ${imageLoaded ? 'opacity-100' : 'opacity-0'} ${showHoverEffects ? 'scale-105' : 'scale-100'}`}
              loading="lazy"
              decoding="async"
              fetchPriority="auto"
              onLoad={handleImageLoad}
              onError={handleImageError}
            />
          )}

          {/* Gradient overlay on hover - Desktop only */}
          {!isMobile && (
            <div
              className={`absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent transition-opacity duration-300 ${showHoverEffects ? 'opacity-100' : 'opacity-0'}`}
            />
          )}

          {/* Rating Badge - Top Left */}
          {rating?.average_rating && rating.total_reviews > 0 && (
            <div className="absolute top-1.5 sm:top-2 left-1.5 sm:left-2 flex items-center gap-0.5 px-1.5 py-0.5 sm:py-1 rounded-md backdrop-blur-md bg-amber-500/90 text-white text-[10px] font-bold z-20">
              <Star className="w-2.5 h-2.5 sm:w-3 sm:h-3 fill-current" />
              <span>{rating.average_rating.toFixed(1)}</span>
            </div>
          )}

          {/* Category Badge with Icon - Always visible */}
          {book.category && (
            <div
              className="absolute bottom-1.5 sm:bottom-2 right-1.5 sm:right-2 px-2 py-1 sm:px-2.5 sm:py-1.5 rounded-lg backdrop-blur-md text-[9px] sm:text-[10px] font-medium text-white flex items-center gap-1 sm:gap-1.5 z-20 border border-white/20"
              style={{ background: getGradientStyle(book.category.icon || 'book', book.category.color) }}
            >
              {getCategoryIcon()}
              <span className="truncate max-w-[60px] sm:max-w-none">{book.category.name}</span>
            </div>
          )}
        </div>

        {/* Book Info - Compact on mobile */}
        <div className="p-3 sm:p-4 flex flex-col flex-grow relative z-10">
          <h3
            className={`font-bold line-clamp-2 mb-1 sm:mb-2 leading-snug text-xs sm:text-sm transition-colors duration-200 ${
              showHoverEffects ? 'text-primary' : 'text-foreground'
            }`}
          >
            {book.title}
          </h3>
          <p className="text-[10px] sm:text-xs text-muted-foreground mb-2 sm:mb-4 truncate">{book.author}</p>

          {/* Stats - Compact on mobile */}
          <div className="flex items-center justify-between text-[10px] sm:text-xs text-muted-foreground mt-auto pt-2 sm:pt-3 border-t border-border/40">
            <div className="flex items-center gap-1 px-1.5 sm:px-2.5 py-1 sm:py-1.5 rounded-lg bg-muted/60">
              <Eye className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              <span className="font-semibold">{(book.view_count ?? 0).toLocaleString('ar-SA')}</span>
            </div>
            <div className="flex items-center gap-1 px-1.5 sm:px-2.5 py-1 sm:py-1.5 rounded-lg bg-muted/60">
              <Download className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              <span className="font-semibold">{(book.download_count ?? 0).toLocaleString('ar-SA')}</span>
            </div>
          </div>
        </div>

        {/* Bottom glow effect on hover - Desktop only */}
        {!isMobile && (
          <div
            className={`absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-secondary to-primary transition-transform duration-400 origin-center ${
              showHoverEffects ? 'scale-x-100' : 'scale-x-0'
            }`}
          />
        )}
      </div>
    </Link>
  );
}));

BookCard.displayName = 'BookCard';

export default BookCard;
