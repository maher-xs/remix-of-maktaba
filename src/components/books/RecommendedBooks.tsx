import { Link } from 'react-router-dom';
import { ArrowLeft, Sparkles } from 'lucide-react';
import BookCard from './BookCard';
import { useBookRecommendations } from '@/hooks/useRecommendations';
import { BookCardSkeleton } from '@/components/ui/loading-skeleton';
import { useAuth } from '@/hooks/useAuth';
import DamascusPattern from '@/components/ui/damascus-pattern';

const RecommendedBooks = () => {
  const { user } = useAuth();
  const { data: recommendations, isLoading } = useBookRecommendations(5);

  // Don't show if user is not logged in
  if (!user) return null;

  // Don't show if no recommendations
  if (!isLoading && (!recommendations || recommendations.length === 0)) return null;

  return (
    <div className="relative overflow-hidden">
      {/* Geometric Pattern floating */}
      <DamascusPattern className="absolute top-0 left-0 w-24 h-24 text-secondary opacity-10 dark:opacity-15 animate-float" />

      {/* Header */}
      <div className="flex items-center justify-between mb-8 relative z-10">
        <div className="flex items-center gap-3">
          <div className="relative bg-gradient-to-br from-secondary to-secondary/80 w-10 h-10 lg:w-12 lg:h-12 rounded-xl flex items-center justify-center shadow-lg shadow-secondary/25">
            <Sparkles className="w-5 h-5 lg:w-6 lg:h-6 text-secondary-foreground" />
          </div>
          <div>
            <h2 className="text-xl lg:text-2xl font-bold text-foreground">
              موصى لك
            </h2>
            <p className="text-xs text-muted-foreground">
              بناءً على قراءاتك السابقة
            </p>
          </div>
        </div>
        <Link
          to="/my-library"
          className="flex items-center gap-1.5 text-primary font-semibold hover:gap-2.5 transition-all text-sm bg-primary/10 hover:bg-primary/15 px-4 py-2 rounded-xl"
        >
          <span>مكتبتي</span>
          <ArrowLeft className="w-4 h-4 rtl-flip" />
        </Link>
      </div>

      {/* Books Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 lg:gap-5 relative z-10">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <BookCardSkeleton key={i} />
          ))
        ) : (
          recommendations?.map((book, index) => (
            <div
              key={book.id}
              className="animate-fade-up"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <BookCard book={book as any} />
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default RecommendedBooks;
