import { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import BookCard from '@/components/books/BookCard';
import { useFavorites } from '@/hooks/useFavorites';
import { useAuth } from '@/hooks/useAuth';
import { useRealtimeFavorites } from '@/hooks/useRealtime';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Heart, BookOpen } from 'lucide-react';
import AdBanner from '@/components/ads/AdBanner';

const Favorites = () => {
  const { user, loading: authLoading } = useAuth();
  const { favorites, isLoading } = useFavorites();
  const navigate = useNavigate();
  
  // Enable realtime sync for favorites
  useRealtimeFavorites();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  if (authLoading || isLoading) {
    return (
      <Layout>
        <div className="section-container py-8 lg:py-12">
          <Skeleton className="h-10 w-48 mb-8" />
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 lg:gap-6">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="space-y-3">
                <Skeleton className="aspect-[10/14] rounded-xl" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            ))}
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <>
        <div className="section-container py-8 lg:py-12">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-xl bg-destructive/10 flex items-center justify-center">
            <Heart className="w-6 h-6 text-destructive" />
          </div>
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-foreground">المفضلة</h1>
            <p className="text-muted-foreground">
              {favorites.length > 0 
                ? `${favorites.length} كتاب محفوظ`
                : 'لم تقم بحفظ أي كتب بعد'
              }
            </p>
          </div>
        </div>

        {/* Content */}
        {favorites.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mx-auto mb-6">
              <BookOpen className="w-10 h-10 text-muted-foreground" />
            </div>
            <h2 className="text-xl font-bold text-foreground mb-2">قائمة المفضلة فارغة</h2>
            <p className="text-muted-foreground mb-6">
              ابدأ بإضافة الكتب التي تعجبك إلى قائمة المفضلة
            </p>
            <Button asChild className="rounded-xl">
              <Link to="/categories">تصفح الكتب</Link>
            </Button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 lg:gap-6">
              {favorites.map((fav) => (
                fav.books && (
                  <BookCard 
                    key={fav.id} 
                    book={fav.books as any}
                  />
                )
              ))}
            </div>
            {/* Ad Banner */}
            <div className="mt-12">
              <AdBanner />
            </div>
          </>
        )}
        </div>
      </>
    </Layout>
  );
};

export default Favorites;
