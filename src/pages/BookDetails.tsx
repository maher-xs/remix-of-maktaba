import { useParams, Link, useNavigate } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import BookCard from '@/components/books/BookCard';
import Breadcrumb from '@/components/ui/breadcrumb-nav';
import { Button } from '@/components/ui/button';
import { useCachedBookById, useCachedBooksByCategory } from '@/hooks/useCachedBooks';
import { useFavorites } from '@/hooks/useFavorites';
import { useAuth } from '@/hooks/useAuth';
import { useOfflineBooks } from '@/hooks/useOfflineBooks';
import OfflineDownloadButton from '@/components/books/OfflineDownloadButton';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { Download, Heart, BookOpen, Calendar, FileText, HardDrive, Eye, Building, User, Pencil, WifiOff, Check, Star, Flag } from 'lucide-react';
import ShareButtons from '@/components/share/ShareButtons';
import { ReportButton } from '@/components/reports/ReportButton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import AdBanner from '@/components/ads/AdBanner';
import BookReviews from '@/components/books/BookReviews';
import BookRatingBadge from '@/components/books/BookRatingBadge';
import { useSEO, generateBookKeywords } from '@/hooks/useSEO';
import { useOnlineStatus } from '@/hooks/useOfflineStorage';
import { useBookSettings } from '@/hooks/useSiteSettings';
import AddToListButton from '@/components/books/AddToListButton';
import BookJsonLd from '@/components/seo/BookJsonLd';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import PullToRefresh from '@/components/ui/PullToRefresh';

// Language code to full name mapping
const getLanguageName = (code: string | null | undefined): string => {
  if (!code) return '';
  
  const languageMap: Record<string, string> = {
    'ar': 'العربية',
    'en': 'الإنجليزية',
    'fr': 'الفرنسية',
    'de': 'الألمانية',
    'es': 'الإسبانية',
    'it': 'الإيطالية',
    'pt': 'البرتغالية',
    'ru': 'الروسية',
    'zh': 'الصينية',
    'ja': 'اليابانية',
    'ko': 'الكورية',
    'tr': 'التركية',
    'fa': 'الفارسية',
    'ur': 'الأردية',
    'hi': 'الهندية',
    'id': 'الإندونيسية',
    'ms': 'الملايوية',
    'nl': 'الهولندية',
    'pl': 'البولندية',
    'sv': 'السويدية',
    'he': 'العبرية',
  };
  
  return languageMap[code.toLowerCase()] || code;
};

// Expandable Description Component
const ExpandableDescription = ({ description }: { description: string }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const maxWords = 6; // Show only first 6 words
  const words = description.split(/\s+/);
  const shouldTruncate = words.length > maxWords;
  const truncatedText = words.slice(0, maxWords).join(' ');

  return (
    <div className="text-right">
      <h2 className="text-base sm:text-lg font-bold text-foreground mb-2 sm:mb-3">نبذة عن الكتاب</h2>
      <p className="text-sm sm:text-base text-muted-foreground leading-relaxed whitespace-pre-line">
        {shouldTruncate && !isExpanded 
          ? `${truncatedText}...` 
          : description}
      </p>
      {shouldTruncate && (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-primary hover:text-primary/80 text-sm font-medium mt-2 transition-colors"
        >
          {isExpanded ? 'عرض أقل' : 'عرض المزيد'}
        </button>
      )}
    </div>
  );
};

const BookDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const { user } = useAuth();
  const { isFavorite, toggleFavorite } = useFavorites();
  const { saveBook, isBookSaved, savingBookId, removeBook } = useOfflineBooks();
  const isOnline = useOnlineStatus();
  
  // جلب إعدادات الكتب من لوحة الأدمن
  const { data: bookSettings } = useBookSettings();

  const { data: book, isLoading: bookLoading } = useCachedBookById(id || '');
  const { data: similarBooks } = useCachedBooksByCategory(book?.category_id || '');

  // Pull to refresh handler
  const handleRefresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ['book', id] });
    await queryClient.invalidateQueries({ queryKey: ['book-rating-seo', id] });
    await queryClient.invalidateQueries({ queryKey: ['book-reviews', id] });
  };

  // جلب تقييم الكتاب للـ JSON-LD
  const { data: bookRating } = useQuery({
    queryKey: ['book-rating-seo', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc('get_book_rating', { p_book_id: id! });
      if (error) throw error;
      return data?.[0] as { average_rating: number; total_reviews: number } | undefined;
    },
    enabled: !!id && !!book,
  });

  // Scroll to top when page loads
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [id]);

  // Preload cover image for faster display
  useEffect(() => {
    if (book?.cover_url) {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'image';
      link.href = book.cover_url;
      link.fetchPriority = 'high';
      document.head.appendChild(link);
      
      // Also create an Image object for immediate caching
      const img = new Image();
      img.src = book.cover_url;
      
      return () => {
        document.head.removeChild(link);
      };
    }
  }, [book?.cover_url]);

  const filteredSimilarBooks = similarBooks?.filter(b => b.id !== book?.id).slice(0, 4);
  const isOwner = user && book?.uploaded_by === user.id;

  // SEO for book page
  useSEO({
    title: book?.title ? `${book.title} - ${book.author}` : 'تفاصيل الكتاب',
    description: book?.description 
      ? `اقرأ وحمّل كتاب ${book.title} للمؤلف ${book.author}. ${book.description.substring(0, 120)}`
      : `اقرأ وحمّل كتاب ${book?.title || ''} للمؤلف ${book?.author || ''} مجاناً من مكتبتي - مكتبتك الرقمية العربية المجانية`,
    keywords: book ? generateBookKeywords(book.title, book.author, book.category?.name) : undefined,
    image: book?.cover_url || undefined,
    url: `https://maktabati.app/book/${id}`,
    type: 'book',
    author: book?.author,
    bookData: book ? {
      author: book.author,
      isbn: book.isbn || undefined,
      releaseDate: book.publish_year?.toString(),
      pages: book.pages || undefined,
    } : undefined,
  });

  // Generate a placeholder gradient based on book title
  const getPlaceholderGradient = (title: string) => {
    const colors = [
      'from-emerald-600 to-emerald-800',
      'from-amber-500 to-amber-700',
      'from-blue-600 to-blue-800',
      'from-purple-600 to-purple-800',
    ];
    const index = title?.charCodeAt(0) % colors.length || 0;
    return colors[index];
  };

  if (!bookLoading && !book) {
    return (
      <Layout>
        <div className="section-container py-16 text-center">
          <BookOpen className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-foreground mb-4">الكتاب غير موجود</h1>
          <p className="text-muted-foreground mb-6">لم نتمكن من العثور على هذا الكتاب</p>
          <Link to="/categories">
            <Button>تصفح المكتبة</Button>
          </Link>
        </div>
      </Layout>
    );
  }

  const handleDownload = async () => {
    if (!book?.file_url || !id) {
      toast.error('ملف الكتاب غير متوفر حالياً');
      return;
    }

    try {
      // Increment download count
      await supabase.rpc('increment_download_count', { book_id: id });
      
      toast.loading('جاري تحميل الكتاب...', { id: 'download' });
      
      const response = await fetch(book.file_url);
      if (!response.ok) throw new Error('فشل في تحميل الملف');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${book.title}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.success('تم تحميل الكتاب بنجاح', { id: 'download' });
    } catch (error) {
      console.error('Download error:', error);
      toast.error('حدث خطأ أثناء التحميل', { id: 'download' });
    }
  };
  const handleRead = () => {
    if (!book?.file_url) {
      toast.error('ملف الكتاب غير متوفر');
      return;
    }
    navigate(`/book/${id}/read`);
  };

  if (bookLoading) {
    return (
      <Layout>
        <div className="section-container py-8 lg:py-12">
          <Skeleton className="h-6 w-64 mb-8" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12">
            <div className="lg:col-span-2">
              <div className="flex flex-col md:flex-row gap-8">
                <Skeleton className="w-48 md:w-64 aspect-[10/14] rounded-2xl" />
                <div className="flex-1 space-y-4">
                  <Skeleton className="h-8 w-3/4" />
                  <Skeleton className="h-6 w-1/2" />
                  <Skeleton className="h-24 w-full" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <PullToRefresh onRefresh={handleRefresh}>
      {/* JSON-LD Structured Data for SEO */}
      {book && (
        <BookJsonLd 
          book={book} 
          rating={bookRating ? {
            average: bookRating.average_rating,
            count: bookRating.total_reviews
          } : undefined}
        />
      )}
      
      <div className="section-container py-6 sm:py-8 lg:py-12">
        <Breadcrumb
          items={[
            { label: 'التصنيفات', href: '/categories' },
            { label: book?.category?.name || '', href: `/categories/${book?.category?.slug}` },
            { label: book?.title || '' },
          ]}
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-12">
          {/* Main Content */}
          <div className="lg:col-span-2 order-1">
            {/* Mobile-First Layout */}
            <div className="flex flex-col gap-5 sm:gap-6">
              {/* Mobile: Modern Clean Design */}
              <div className="sm:hidden">
                {/* Hero Section with Cover */}
                <div className="relative -mx-4 -mt-2 mb-4">
                  {/* Background blur effect */}
                  {book?.cover_url && (
                    <div 
                      className="absolute inset-0 h-32 bg-cover bg-center opacity-20 blur-xl"
                      style={{ backgroundImage: `url(${book.cover_url})` }}
                    />
                  )}
                  
                  <div className="relative flex items-end gap-4 px-4 pt-4 pb-2">
                    {/* Cover Image */}
                    <div className="flex-shrink-0">
                      <div className="relative w-24 h-36 rounded-lg overflow-hidden shadow-xl bg-muted ring-2 ring-background">
                        {!imageLoaded && !imageError && <div className="absolute inset-0 skeleton" />}
                        
                        {(imageError || !book?.cover_url) ? (
                          <div className={`absolute inset-0 bg-gradient-to-br ${getPlaceholderGradient(book?.title || '')} flex items-center justify-center p-2`}>
                            <span className="text-white text-center font-bold text-xs">{book?.title}</span>
                          </div>
                        ) : (
                          <img
                            src={book.cover_url}
                            alt={`غلاف كتاب ${book.title}`}
                            className={`w-full h-full object-cover transition-opacity duration-300 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
                            loading="eager"
                            onLoad={() => setImageLoaded(true)}
                            onError={() => setImageError(true)}
                          />
                        )}
                      </div>
                    </div>

                    {/* Title & Author */}
                    <div className="flex-1 min-w-0 pt-2">
                      <h1 className="text-lg font-bold text-foreground leading-snug mb-1 text-right" dir="rtl">
                        {book?.title}
                      </h1>
                      <p className="text-sm text-muted-foreground text-right">{book?.author}</p>
                      
                      {/* Rating */}
                      {id && bookSettings.showBookRating && (
                        <div className="mt-2">
                          <BookRatingBadge bookId={id} size="sm" />
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Quick Info Row */}
                <div className="flex items-center justify-between text-xs text-muted-foreground mb-4 px-1">
                  <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1">
                      <Eye className="w-3.5 h-3.5" />
                      {book?.view_count?.toLocaleString('ar-SA')}
                    </span>
                    <span className="flex items-center gap-1">
                      <Download className="w-3.5 h-3.5" />
                      {book?.download_count?.toLocaleString('ar-SA')}
                    </span>
                  </div>
                  
                  {/* Owner Edit */}
                  {isOwner && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-1 h-7 text-xs text-primary"
                      onClick={() => navigate(`/book/${id}/edit`)}
                    >
                      <Pencil className="w-3 h-3" />
                      تعديل
                    </Button>
                  )}
                </div>

                {/* Meta Pills */}
                <div className="flex flex-wrap gap-2 mb-4">
                  {book?.pages && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-muted rounded-full text-xs">
                      <FileText className="w-3 h-3" />
                      {book.pages} صفحة
                    </span>
                  )}
                  {book?.file_size && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-muted rounded-full text-xs">
                      <HardDrive className="w-3 h-3" />
                      {book.file_size}
                    </span>
                  )}
                  {book?.publish_year && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-muted rounded-full text-xs">
                      <Calendar className="w-3 h-3" />
                      {book.publish_year}
                    </span>
                  )}
                  {book?.language && (
                    <span className="inline-flex items-center px-3 py-1.5 bg-muted rounded-full text-xs">
                      {getLanguageName(book.language)}
                    </span>
                  )}
                </div>

                {/* Publisher */}
                {book?.publisher && (
                  <p className="text-xs text-muted-foreground mb-4">
                    <Building className="w-3 h-3 inline ml-1" />
                    الناشر: {book.publisher}
                  </p>
                )}
              </div>

              {/* Desktop: Original Layout */}
              <div className="hidden sm:flex gap-6 lg:gap-8">
                {/* Cover Image - Desktop */}
                <div className="flex-shrink-0">
                  <div className="relative w-48 md:w-64 max-w-[280px] max-h-[392px] aspect-[10/14] rounded-2xl overflow-hidden shadow-card bg-muted border border-border/50">
                    {!imageLoaded && !imageError && <div className="absolute inset-0 skeleton" />}
                    
                    {(imageError || !book?.cover_url) ? (
                      <div className={`absolute inset-0 bg-gradient-to-br ${getPlaceholderGradient(book?.title || '')} flex items-center justify-center p-4`}>
                        <span className="text-white text-center font-bold text-base lg:text-lg">{book?.title}</span>
                      </div>
                    ) : (
                      <img
                        src={book.cover_url}
                        alt={`غلاف كتاب ${book.title}`}
                        className={`w-full h-full object-cover transition-opacity duration-300 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
                        loading="eager"
                        decoding="async"
                        fetchPriority="high"
                        onLoad={() => setImageLoaded(true)}
                        onError={() => setImageError(true)}
                      />
                    )}
                  </div>
                </div>

                {/* Book Info - Desktop */}
                <div className="flex-1 text-right">
                  {/* Owner Controls */}
                  {isOwner && (
                    <div className="mb-3">
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-2"
                        onClick={() => navigate(`/book/${id}/edit`)}
                      >
                        <Pencil className="w-4 h-4" />
                        تعديل الكتاب
                      </Button>
                    </div>
                  )}

                  <h1 className="text-2xl lg:text-3xl font-bold text-foreground mb-2 flex items-center gap-2 flex-wrap">
                    {book?.title}
                    {id && bookSettings.showBookRating && <BookRatingBadge bookId={id} size="md" />}
                  </h1>
                  <p className="text-lg text-muted-foreground mb-6">{book?.author}</p>

                  {/* Stats */}
                  <div className="flex items-center gap-4 mb-6 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Eye className="w-4 h-4" />
                      <span>{book?.view_count.toLocaleString('ar-SA')} مشاهدة</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Download className="w-4 h-4" />
                      <span>{book?.download_count.toLocaleString('ar-SA')} تحميل</span>
                    </div>
                  </div>

                  {/* Meta Badges */}
                  <div className="flex flex-wrap gap-3 mb-6">
                    {book?.pages && (
                      <div className="flex items-center gap-2 px-3 py-2 bg-muted rounded-xl text-sm">
                        <FileText className="w-4 h-4 text-muted-foreground" />
                        <span>{book.pages} صفحة</span>
                      </div>
                    )}
                    {book?.file_size && (
                      <div className="flex items-center gap-2 px-3 py-2 bg-muted rounded-xl text-sm">
                        <HardDrive className="w-4 h-4 text-muted-foreground" />
                        <span>{book.file_size}</span>
                      </div>
                    )}
                    {book?.publish_year && (
                      <div className="flex items-center gap-2 px-3 py-2 bg-muted rounded-xl text-sm">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        <span>{book.publish_year}</span>
                      </div>
                    )}
                    {book?.language && (
                      <div className="flex items-center gap-2 px-3 py-2 bg-muted rounded-xl text-sm">
                        <span>{getLanguageName(book.language)}</span>
                      </div>
                    )}
                  </div>

                  {/* Publisher */}
                  {book?.publisher && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
                      <Building className="w-4 h-4" />
                      <span>الناشر: {book.publisher}</span>
                    </div>
                  )}

                  {/* Action Buttons - Desktop */}
                  <div className="space-y-3 mb-8">
                    <div className="flex gap-3">
                      {bookSettings.showReadOnlineButton && (
                        <Button 
                          className="h-12 px-6 rounded-xl btn-primary-glow"
                          onClick={handleRead}
                          disabled={!book?.file_url}
                        >
                          <BookOpen className="w-5 h-5 ml-2" />
                          اقرأ الآن
                        </Button>
                      )}
                      
                      {bookSettings.showDownloadButton && (
                        <Button
                          variant="outline"
                          className="h-12 px-6 rounded-xl border-2"
                          onClick={handleDownload}
                          disabled={!book?.file_url}
                        >
                          <Download className="w-5 h-5 ml-2" />
                          تحميل PDF
                        </Button>
                      )}
                    </div>
                    
                    {/* Secondary Actions Row */}
                    <div className="flex gap-2">
                      {user && (
                        <Button
                          variant="outline"
                          size="icon"
                          className={`h-9 w-9 rounded-lg border ${isFavorite(id || '') ? 'text-destructive border-destructive bg-destructive/10' : ''}`}
                          onClick={() => toggleFavorite(id || '')}
                        >
                          <Heart className={`w-4 h-4 ${isFavorite(id || '') ? 'fill-destructive' : ''}`} />
                        </Button>
                      )}
                      
                      {book && book.file_url && (
                        <OfflineDownloadButton book={book} variant="icon" />
                      )}
                      
                      {user && id && (
                        <AddToListButton bookId={id} variant="icon" />
                      )}
                      
                      <ShareButtons 
                        title={book?.title || 'كتاب'}
                        description={`اقرأ كتاب "${book?.title}" للمؤلف ${book?.author}`}
                        variant="icon"
                      />
                      
                      {id && (
                        <ReportButton 
                          contentType="book" 
                          contentId={id} 
                          contentTitle={book?.title}
                          variant="icon"
                        />
                      )}
                    </div>
                  </div>

                  {/* Description */}
                  {book?.description && (
                    <ExpandableDescription description={book.description} />
                  )}

                  {/* Reviews Section */}
                  {id && bookSettings.showBookReviews && (
                    <div className="mt-8 pt-8 border-t border-border">
                      <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
                        <Star className="w-5 h-5 text-amber-500" />
                        التقييمات والمراجعات
                      </h2>
                      <BookReviews bookId={id} />
                    </div>
                  )}
                </div>
              </div>

              {/* Mobile: Action Buttons Section */}
              <div className="sm:hidden space-y-4">
                {/* Primary Actions */}
                <div className="flex gap-2">
                  {bookSettings.showReadOnlineButton && (
                    <Button 
                      className="flex-1 h-11 rounded-full text-sm font-medium"
                      onClick={handleRead}
                      disabled={!book?.file_url}
                    >
                      <BookOpen className="w-4 h-4 ml-1.5" />
                      اقرأ الآن
                    </Button>
                  )}
                  
                  {bookSettings.showDownloadButton && (
                    <Button
                      variant="secondary"
                      className="flex-1 h-11 rounded-full text-sm font-medium"
                      onClick={handleDownload}
                      disabled={!book?.file_url}
                    >
                      <Download className="w-4 h-4 ml-1.5" />
                      تحميل
                    </Button>
                  )}
                </div>
                
                {/* Secondary Actions */}
                <div className="flex items-center justify-center gap-2">
                  {user && (
                    <Button
                      variant="outline"
                      size="icon"
                      className={`h-9 w-9 rounded-lg border ${isFavorite(id || '') ? 'text-destructive border-destructive bg-destructive/10' : ''}`}
                      onClick={() => toggleFavorite(id || '')}
                    >
                      <Heart className={`w-4 h-4 ${isFavorite(id || '') ? 'fill-destructive' : ''}`} />
                    </Button>
                  )}
                  
                  {book && book.file_url && (
                    <OfflineDownloadButton book={book} variant="icon" />
                  )}
                  
                  {user && id && (
                    <AddToListButton bookId={id} variant="icon" />
                  )}
                  
                  <ShareButtons 
                    title={book?.title || 'كتاب'}
                    description={`اقرأ كتاب "${book?.title}" للمؤلف ${book?.author}`}
                    variant="icon"
                  />
                  
                  {id && (
                    <ReportButton 
                      contentType="book" 
                      contentId={id} 
                      contentTitle={book?.title}
                      variant="icon"
                    />
                  )}
                </div>

                {/* Description */}
                {book?.description && (
                  <div className="pt-3">
                    <ExpandableDescription description={book.description} />
                  </div>
                )}

                {/* Reviews */}
                {id && bookSettings.showBookReviews && (
                  <div className="pt-4 border-t border-border/50">
                    <h2 className="text-base font-semibold text-foreground mb-3 flex items-center gap-2">
                      <Star className="w-4 h-4 text-amber-500" />
                      التقييمات والمراجعات
                    </h2>
                    <BookReviews bookId={id} />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-4 sm:space-y-6 lg:space-y-8 order-2">
            {/* Ad Banner - Desktop only at top */}
            <div className="hidden lg:block">
              <AdBanner variant="sidebar" />
            </div>

            {/* Uploader Info */}
            {book?.uploader && (
              <div className="sidebar-card p-4 sm:p-6">
                <h3 className="font-bold text-foreground mb-3 sm:mb-4 text-sm sm:text-base">رُفع بواسطة</h3>
                {book.uploader.is_public && book.uploader.username ? (
                  <Link
                    to={`/user/${book.uploader.username}`}
                    className="flex items-center gap-3 p-2.5 sm:p-3 bg-muted rounded-lg sm:rounded-xl hover:bg-muted/80 transition-colors"
                  >
                    <Avatar className="h-9 w-9 sm:h-10 sm:w-10">
                      <AvatarImage src={book.uploader.avatar_url || undefined} />
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {book.uploader.full_name?.charAt(0) || book.uploader.username?.charAt(0) || <User className="h-4 w-4 sm:h-5 sm:w-5" />}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-foreground text-sm sm:text-base">{book.uploader.full_name || book.uploader.username}</p>
                      <p className="text-xs sm:text-sm text-muted-foreground">@{book.uploader.username}</p>
                    </div>
                  </Link>
                ) : (
                  <div className="flex items-center gap-3 p-2.5 sm:p-3 bg-muted rounded-lg sm:rounded-xl">
                    <Avatar className="h-9 w-9 sm:h-10 sm:w-10">
                      <AvatarFallback className="bg-primary/10 text-primary">
                        <User className="h-4 w-4 sm:h-5 sm:w-5" />
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-foreground text-sm sm:text-base">مستخدم</p>
                      <p className="text-xs sm:text-sm text-muted-foreground">ملف شخصي خاص</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Category */}
            {book?.category && (
              <div className="sidebar-card p-4 sm:p-6">
                <h3 className="font-bold text-foreground mb-3 sm:mb-4 text-sm sm:text-base">التصنيف</h3>
                <Link
                  to={`/categories/${book.category.slug}`}
                  className="flex items-center gap-3 p-2.5 sm:p-3 bg-muted rounded-lg sm:rounded-xl hover:bg-muted/80 transition-colors"
                >
                  <div className="content-card-icon w-9 h-9 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center">
                    <BookOpen className="w-4 h-4 sm:w-5 sm:h-5" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground text-sm sm:text-base">{book.category.name}</p>
                    <p className="text-xs sm:text-sm text-muted-foreground">تصفح التصنيف</p>
                  </div>
                </Link>
              </div>
            )}

            {/* Mobile Ad Banner */}
            <div className="lg:hidden">
              <AdBanner variant="sidebar" page="book_details" />
            </div>

            {/* Similar Books - يظهر فقط إذا كان مفعل في الإعدادات */}
            {bookSettings.showRelatedBooks && filteredSimilarBooks && filteredSimilarBooks.length > 0 && (
              <div className="sidebar-card p-4 sm:p-6">
                <h3 className="font-bold text-foreground mb-3 sm:mb-4 text-sm sm:text-base">كتب مشابهة</h3>
                <div className="grid grid-cols-2 gap-2 sm:gap-3">
                  {filteredSimilarBooks.map((similarBook) => (
                    <BookCard key={similarBook.id} book={similarBook} />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      </PullToRefresh>
    </Layout>
  );
};

export default BookDetails;
