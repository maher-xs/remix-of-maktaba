import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import BookCard from '@/components/books/BookCard';
import { useFavorites } from '@/hooks/useFavorites';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Heart, BookOpen, Library, Clock, Upload } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import type { Tables } from '@/integrations/supabase/types';
import AdBanner from '@/components/ads/AdBanner';

type Book = Tables<'books'>;
type ReadingProgressRow = Tables<'reading_progress'>;
type ReadingProgressItem = ReadingProgressRow & { books: Book | null };


const MyLibrary = () => {
  const { user, loading: authLoading } = useAuth();
  const { favorites, isLoading } = useFavorites();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('uploads');

  // Fetch books uploaded by the user
  const { data: myBooks, isLoading: booksLoading } = useQuery({
    queryKey: ['my-uploaded-books', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('books')
        .select('*')
        .eq('uploaded_by', user.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Book[];
    },
    enabled: !!user,
  });

  // Fetch currently reading count (always enabled for badge)
  const { data: readingCount } = useQuery({
    queryKey: ['currently-reading-count', user?.id],
    queryFn: async () => {
      if (!user) return 0;
      const { count, error } = await supabase
        .from('reading_progress')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_completed', false)
        .gt('current_page', 0);

      if (error) return 0;
      return count || 0;
    },
    enabled: !!user,
  });

  // Fetch currently reading progress (only when tab is active)
  const { data: currentlyReading, isLoading: readingLoading } = useQuery({
    queryKey: ['currently-reading', user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from('reading_progress')
        .select('*, books(*)')
        .eq('user_id', user.id)
        .eq('is_completed', false)
        .gt('current_page', 0)
        .order('last_read_at', { ascending: false });

      if (error) throw error;
      return (data || []) as unknown as ReadingProgressItem[];
    },
    enabled: !!user && activeTab === 'reading',
    staleTime: 1000 * 30,
  });

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  if (authLoading || isLoading || booksLoading) {
    return (
      <Layout>
        <div className="section-container py-8 lg:py-12">
          <Skeleton className="h-10 w-48 mb-8" />
          <Skeleton className="h-12 w-full max-w-md mb-8" />
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 lg:gap-6">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="space-y-3">
                <Skeleton className="aspect-[3/4] rounded-xl" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            ))}
          </div>
        </div>
      </Layout>
    );
  }

  const EmptyState = ({ icon: Icon, title, description, action }: { 
    icon: any; 
    title: string; 
    description: string;
    action?: { label: string; to: string };
  }) => (
    <div className="text-center py-16">
      <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mx-auto mb-6">
        <Icon className="w-10 h-10 text-muted-foreground" />
      </div>
      <h2 className="text-xl font-bold text-foreground mb-2">{title}</h2>
      <p className="text-muted-foreground mb-6">{description}</p>
      <Button asChild className="rounded-xl">
        <Link to={action?.to || '/categories'}>{action?.label || 'تصفح الكتب'}</Link>
      </Button>
    </div>
  );

  return (
    <Layout>
      <>
        <div className="section-container py-6 sm:py-12 px-4 sm:px-6">
        {/* Header - All in one row */}
        <div className="flex flex-col lg:flex-row lg:items-center gap-4 mb-6 sm:mb-8">
          {/* Title */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Library className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
            </div>
          <div className="space-y-1">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground">مكتبتي</h1>
            <p className="text-xs sm:text-sm text-muted-foreground hidden sm:block mt-1.5">إدارة كتبك المرفوعة والمفضلة</p>
          </div>
          </div>

          {/* Tabs */}
          <div className="flex items-center lg:justify-end flex-1 mt-2 lg:mt-0">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-shrink-0">
              <TabsList className="h-10 sm:h-11 p-1 bg-muted rounded-xl">
                <TabsTrigger 
                  value="uploads" 
                  className="h-full rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm gap-1.5 sm:gap-2 px-3 sm:px-4 text-xs sm:text-sm"
                >
                  <Upload className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span>المرفوعة</span>
                  {myBooks && myBooks.length > 0 && (
                    <span className="bg-primary text-primary-foreground text-[10px] sm:text-xs px-1.5 py-0.5 rounded-full">
                      {myBooks.length}
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger 
                  value="favorites" 
                  className="h-full rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm gap-1.5 sm:gap-2 px-3 sm:px-4 text-xs sm:text-sm"
                >
                  <Heart className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span>المفضلة</span>
                  {favorites.length > 0 && (
                    <span className="bg-destructive text-destructive-foreground text-[10px] sm:text-xs px-1.5 py-0.5 rounded-full">
                      {favorites.length}
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger 
                  value="reading" 
                  className="h-full rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm gap-1.5 sm:gap-2 px-3 sm:px-4 text-xs sm:text-sm"
                >
                  <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span>القراءة</span>
                  {readingCount && readingCount > 0 && (
                    <span className="bg-amber-500 text-white text-[10px] sm:text-xs px-1.5 py-0.5 rounded-full">
                      {readingCount}
                    </span>
                  )}
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>

        {/* Tabs Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">

          {/* My Uploads Tab */}
          <TabsContent value="uploads">
            {!myBooks || myBooks.length === 0 ? (
              <EmptyState
                icon={Upload}
                title="لم ترفع أي كتب بعد"
                description="شارك الكتب مع مجتمع القراء وابدأ برفع أول كتاب"
                action={{ label: 'رفع كتاب', to: '/upload' }}
              />
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 lg:gap-6">
                {myBooks.map((book, index) => (
                  <React.Fragment key={book.id}>
                    <BookCard book={book} />
                    {(index + 1) % 10 === 0 && index < myBooks.length - 1 && (
                      <div className="col-span-full">
                        <AdBanner variant="inline" />
                      </div>
                    )}
                  </React.Fragment>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Favorites Tab */}
          <TabsContent value="favorites">
            {favorites.length === 0 ? (
              <EmptyState
                icon={Heart}
                title="قائمة المفضلة فارغة"
                description="ابدأ بإضافة الكتب التي تعجبك إلى قائمة المفضلة"
              />
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 lg:gap-6">
                {favorites.map((fav, index) => (
                  <React.Fragment key={fav.id}>
                    {fav.books && <BookCard book={fav.books as any} />}
                    {(index + 1) % 10 === 0 && index < favorites.length - 1 && (
                      <div className="col-span-full">
                        <AdBanner variant="inline" />
                      </div>
                    )}
                  </React.Fragment>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Reading Tab */}
          <TabsContent value="reading">
            {readingLoading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 lg:gap-6">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="space-y-3">
                    <Skeleton className="aspect-[3/4] rounded-xl" />
                    <Skeleton className="h-3 w-3/4" />
                    <Skeleton className="h-2 w-full" />
                    <Skeleton className="h-8 w-full rounded-xl" />
                  </div>
                ))}
              </div>
            ) : !currentlyReading || currentlyReading.length === 0 ? (
              <EmptyState
                icon={Clock}
                title="لا توجد كتب قيد القراءة"
                description="ابدأ بقراءة كتاب وسيظهر هنا تلقائياً"
              />
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 lg:gap-6">
                {currentlyReading.map((item, index) => {
                  const book = item.books;
                  if (!book) return null;

                  const percent = item.total_pages
                    ? Math.min(100, Math.round((item.current_page / item.total_pages) * 100))
                    : 0;

                  return (
                    <React.Fragment key={item.id}>
                      <div className="group bg-card rounded-xl border border-border overflow-hidden transition-all duration-300 hover:shadow-lg hover:shadow-primary/10 hover:border-primary/30 hover:-translate-y-1">
                        {/* Cover Image */}
                        <Link to={`/book/${item.book_id}`} className="block">
                          <div className="relative aspect-[3/4] overflow-hidden bg-muted">
                            {book.cover_url ? (
                              <img
                                src={book.cover_url}
                                alt={`غلاف كتاب ${book.title}`}
                                className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                                loading="lazy"
                              />
                            ) : (
                              <div className="absolute inset-0 bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center p-3">
                                <span className="text-white text-center font-bold text-xs line-clamp-3">{book.title}</span>
                              </div>
                            )}
                          </div>
                        </Link>

                        {/* Info + Progress */}
                        <div className="p-3 space-y-2">
                          <Link to={`/book/${item.book_id}`} className="block">
                            <h3 className="font-bold text-foreground line-clamp-1 text-xs sm:text-sm hover:text-primary transition-colors">
                              {book.title}
                            </h3>
                            <p className="text-[10px] sm:text-xs text-muted-foreground truncate">{book.author}</p>
                          </Link>

                          {/* Progress */}
                          <div className="pt-2 border-t border-border">
                            <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1.5">
                              <span>{item.current_page} / {item.total_pages ?? '—'}</span>
                              <span className="font-medium text-primary">{percent}%</span>
                            </div>
                            <Progress value={percent} className="h-1.5" />
                          </div>

                          {/* Continue Button */}
                          <Button asChild size="sm" className="w-full rounded-lg h-8 text-xs">
                            <Link to={`/book/${item.book_id}/read`}>
                              <BookOpen className="w-3.5 h-3.5 ml-1.5" />
                              تابع القراءة
                            </Link>
                          </Button>
                        </div>
                      </div>
                      {(index + 1) % 10 === 0 && index < currentlyReading.length - 1 && (
                        <div className="col-span-full">
                          <AdBanner variant="inline" />
                        </div>
                      )}
                    </React.Fragment>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
        </div>
      </>
    </Layout>
  );
};

export default MyLibrary;
