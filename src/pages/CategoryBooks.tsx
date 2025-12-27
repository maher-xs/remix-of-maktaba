import React from 'react';
import { useParams } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import BookCard from '@/components/books/BookCard';
import Breadcrumb from '@/components/ui/breadcrumb-nav';
import { useCachedCategoryBySlug } from '@/hooks/useCachedCategories';
import { useCachedBooksByCategory } from '@/hooks/useCachedBooks';
import { BookCardSkeleton } from '@/components/ui/loading-skeleton';
import { Grid3X3, List, BookOpen, FlaskConical, PenLine, Target, Landmark, Laptop, Moon, Baby, GraduationCap, Filter, X, WifiOff } from 'lucide-react';
import { useState, useMemo } from 'react';
import AdBanner from '@/components/ads/AdBanner';
import { useSEO, generateCategoryKeywords } from '@/hooks/useSEO';
import { useOnlineStatus } from '@/hooks/useOfflineStorage';
import CategoryJsonLd from '@/components/seo/CategoryJsonLd';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// Map icon names to Lucide icons
const iconMap: Record<string, React.ReactNode> = {
  'graduation-cap': <GraduationCap className="w-8 h-8" />,
  'flask': <FlaskConical className="w-8 h-8" />,
  'book-open': <BookOpen className="w-8 h-8" />,
  'target': <Target className="w-8 h-8" />,
  'landmark': <Landmark className="w-8 h-8" />,
  'laptop': <Laptop className="w-8 h-8" />,
  'moon': <Moon className="w-8 h-8" />,
  'baby': <Baby className="w-8 h-8" />,
  'book': <BookOpen className="w-8 h-8" />,
};

const CategoryBooks = () => {
  const { slug } = useParams<{ slug: string }>();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState('downloads');
  const [languageFilter, setLanguageFilter] = useState<string>('all');
  const [yearFilter, setYearFilter] = useState<string>('all');
  const isOnline = useOnlineStatus();

  const { data: category, isLoading: categoryLoading } = useCachedCategoryBySlug(slug || '');
  const { data: books, isLoading: booksLoading } = useCachedBooksByCategory(category?.id || '');

  const isLoading = categoryLoading || booksLoading;

  // SEO for category page
  useSEO({
    title: category?.name ? `كتب ${category.name}` : 'التصنيفات',
    description: category 
      ? `تصفح وحمّل كتب ${category.name} مجاناً. ${category.description || ''} - اكتشف ${books?.length || 0} كتاب في قسم ${category.name}`
      : 'تصفح جميع تصنيفات الكتب العربية المجانية',
    keywords: category ? generateCategoryKeywords(category.name) : undefined,
    url: `https://maktaba.cc/categories/${slug}`,
    type: 'website',
  });

  // اللغات المتاحة (نفس اللغات في نموذج الرفع)
  const allLanguages = [
    'العربية',
    'الإنجليزية', 
    'الفرنسية',
    'الألمانية',
    'الإسبانية',
    'التركية',
    'الفارسية',
    'الأردية',
    'أخرى'
  ];

  // استخراج السنوات المتاحة من الكتب
  const availableYears = useMemo(() => {
    if (!books) return [];
    
    const years = [...new Set(books.map(book => book.publish_year).filter(Boolean))]
      .sort((a, b) => (b as number) - (a as number)) as number[];
    
    return years;
  }, [books]);

  // فلترة وترتيب الكتب
  const filteredAndSortedBooks = useMemo(() => {
    if (!books) return [];
    
    let filtered = [...books];
    
    // فلترة حسب اللغة
    if (languageFilter !== 'all') {
      filtered = filtered.filter(book => book.language === languageFilter);
    }
    
    // فلترة حسب سنة النشر
    if (yearFilter !== 'all') {
      filtered = filtered.filter(book => book.publish_year?.toString() === yearFilter);
    }
    
    // ترتيب الكتب
    return filtered.sort((a, b) => {
      switch (sortBy) {
        case 'downloads':
          return b.download_count - a.download_count;
        case 'views':
          return b.view_count - a.view_count;
        case 'newest':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        default:
          return 0;
      }
    });
  }, [books, sortBy, languageFilter, yearFilter]);

  const hasActiveFilters = languageFilter !== 'all' || yearFilter !== 'all';

  const clearFilters = () => {
    setLanguageFilter('all');
    setYearFilter('all');
  };

  const getLanguageLabel = (lang: string) => {
    // إذا كانت اللغة بالفعل بالعربية (من النموذج الجديد)
    const arabicLabels = ['العربية', 'الإنجليزية', 'الفرنسية', 'الألمانية', 'الإسبانية', 'التركية', 'الفارسية', 'الأردية', 'أخرى'];
    if (arabicLabels.includes(lang)) {
      return lang;
    }
    
    // للكتب القديمة التي كانت تستخدم رموز اللغات
    const labels: Record<string, string> = {
      'ar': 'العربية',
      'en': 'الإنجليزية',
      'fr': 'الفرنسية',
      'de': 'الألمانية',
      'es': 'الإسبانية',
      'tr': 'التركية',
      'fa': 'الفارسية',
      'ur': 'الأردية',
    };
    return labels[lang] || lang;
  };

  if (!categoryLoading && !category) {
    return (
      <Layout>
        <div className="section-container py-16 text-center">
          <h1 className="text-2xl font-bold text-foreground mb-4">التصنيف غير موجود</h1>
          <p className="text-muted-foreground">لم نتمكن من العثور على هذا التصنيف</p>
        </div>
      </Layout>
    );
  }

  const icon = category ? (iconMap[category.icon] || <BookOpen className="w-8 h-8" />) : null;

  return (
    <Layout>
      {/* JSON-LD Structured Data */}
      {category && books && (
        <CategoryJsonLd 
          category={category} 
          books={books}
        />
      )}
      
      <>
        <div className="section-container py-8 lg:py-12">
          <Breadcrumb
            items={[
              { label: 'التصنيفات', href: '/categories' },
              { label: category?.name || '' },
            ]}
          />

        {/* Offline Notice */}
        {!isOnline && (
          <div className="flex items-center justify-center gap-2 bg-muted/50 text-muted-foreground p-4 rounded-xl mb-6">
            <WifiOff className="w-5 h-5" />
            <span>أنت غير متصل بالإنترنت - يتم عرض البيانات المخزنة مؤقتاً</span>
          </div>
        )}
        {/* Category Header */}
        <div className="flex items-center gap-4 mb-8">
          {category && (
            <>
              <div className="content-card-icon w-16 h-16 rounded-2xl flex items-center justify-center">
                {icon}
              </div>
              <div>
                <h1 className="text-2xl lg:text-3xl font-bold text-foreground mb-1">
                  {category.name}
                </h1>
                <p className="text-muted-foreground">
                  {category.description} • {filteredAndSortedBooks.length || 0} كتاب
                </p>
              </div>
            </>
          )}
        </div>

        {/* Filter Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4 pb-4 border-b border-border">
          {/* Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto">
            {[
              { key: 'downloads', label: 'الأكثر تحميلاً' },
              { key: 'views', label: 'الأكثر مشاهدة' },
              { key: 'newest', label: 'الأحدث' },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setSortBy(tab.key)}
                className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                  sortBy === tab.key
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* View Toggle */}
          <div className="flex items-center bg-muted rounded-xl p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg transition-all ${
                viewMode === 'grid' ? 'bg-card shadow-sm' : ''
              }`}
              aria-label="عرض شبكي"
            >
              <Grid3X3 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-lg transition-all ${
                viewMode === 'list' ? 'bg-card shadow-sm' : ''
              }`}
              aria-label="عرض قائمة"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Filters Row */}
        <div className="flex flex-wrap items-center gap-3 mb-8">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Filter className="w-4 h-4" />
            <span>فلترة:</span>
          </div>
          
          {/* Language Filter */}
          <Select value={languageFilter} onValueChange={setLanguageFilter}>
            <SelectTrigger className="w-[140px] h-9">
              <SelectValue placeholder="اللغة" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كل اللغات</SelectItem>
              {allLanguages.map((lang) => (
                <SelectItem key={lang} value={lang}>
                  {lang}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Year Filter */}
          {availableYears.length > 0 && (
            <Select value={yearFilter} onValueChange={setYearFilter}>
              <SelectTrigger className="w-[140px] h-9">
                <SelectValue placeholder="سنة النشر" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل السنوات</SelectItem>
                {availableYears.map((year) => (
                  <SelectItem key={year} value={year.toString()}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* Clear Filters */}
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1 px-3 py-1.5 text-sm text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
              مسح الفلاتر
            </button>
          )}
        </div>

        {/* Books Grid */}
        <div className={`grid gap-4 lg:gap-6 ${
          viewMode === 'grid'
            ? 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5'
            : 'grid-cols-1'
        }`}>
          {isLoading ? (
            Array.from({ length: 10 }).map((_, i) => (
              <BookCardSkeleton key={i} />
            ))
          ) : filteredAndSortedBooks.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                {hasActiveFilters ? 'لا توجد كتب تطابق الفلاتر المحددة' : 'لا توجد كتب في هذا التصنيف حالياً'}
              </p>
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="mt-4 text-primary hover:underline"
                >
                  مسح الفلاتر
                </button>
              )}
            </div>
          ) : (
            filteredAndSortedBooks.map((book, index) => (
              <React.Fragment key={book.id}>
                <div
                  className="animate-fade-up"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <BookCard book={book} />
                </div>
                {/* Ad Banner - Every 20 books */}
                {(index + 1) % 20 === 0 && index < filteredAndSortedBooks.length - 1 && (
                  <div className="col-span-full">
                    <AdBanner variant="inline" page="categories" />
                  </div>
                )}
              </React.Fragment>
            ))
          )}
        </div>

        {/* Ad Banner */}
        <div className="mt-12">
          <AdBanner page="categories" />
        </div>

        {/* Books Count */}
        {filteredAndSortedBooks.length > 0 && (
          <div className="mt-8 text-center">
            <p className="text-sm text-muted-foreground">
              عرض {filteredAndSortedBooks.length} {books && filteredAndSortedBooks.length !== books.length ? `من ${books.length}` : ''} كتاب
            </p>
          </div>
        )}
        </div>
      </>
    </Layout>
  );
};

export default CategoryBooks;
