import Layout from '@/components/layout/Layout';
import CategoryCard from '@/components/categories/CategoryCard';
import Breadcrumb from '@/components/ui/breadcrumb-nav';
import { useCachedCategories } from '@/hooks/useCachedCategories';
import { CategoryCardSkeleton } from '@/components/ui/loading-skeleton';
import { Layers, WifiOff } from 'lucide-react';
import AdBanner from '@/components/ads/AdBanner';
import { useOnlineStatus } from '@/hooks/useOfflineStorage';

const Categories = () => {
  const { data: categories, isLoading, error } = useCachedCategories();
  const isOnline = useOnlineStatus();

  return (
    <Layout>
      <div className="section-container py-8 lg:py-12">
        <Breadcrumb items={[{ label: 'التصنيفات' }]} />

        {/* Header - Compact on mobile */}
        <div className="text-center mb-8 sm:mb-12">
          <div className="content-card-icon w-12 h-12 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl flex items-center justify-center mx-auto mb-4 sm:mb-6">
            <Layers className="w-6 h-6 sm:w-8 sm:h-8" />
          </div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground mb-2 sm:mb-4">
            تصفح التصنيفات
          </h1>
          <p className="text-sm sm:text-lg text-muted-foreground max-w-xl mx-auto px-4 sm:px-0">
            اختر التصنيف الذي يهمك واستكشف مجموعة واسعة من الكتب العربية المجانية
          </p>
        </div>

        {/* Offline Notice */}
        {!isOnline && (
          <div className="flex items-center justify-center gap-2 bg-muted/50 text-muted-foreground p-3 sm:p-4 rounded-xl mb-6 sm:mb-8 text-sm">
            <WifiOff className="w-4 h-4 sm:w-5 sm:h-5" />
            <span>أنت غير متصل - يتم عرض البيانات المخزنة</span>
          </div>
        )}

        {/* Error State */}
        {error && isOnline && (
          <div className="text-center py-12">
            <p className="text-destructive">حدث خطأ في تحميل التصنيفات</p>
          </div>
        )}

        {/* Categories Grid - 2 columns on mobile */}
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
          {isLoading ? (
            Array.from({ length: 8 }).map((_, i) => (
              <CategoryCardSkeleton key={i} />
            ))
          ) : (
            categories?.map((category, index) => (
              <div
                key={category.id}
                className="animate-fade-up"
                style={{ animationDelay: `${index * 75}ms` }}
              >
                <CategoryCard category={category} size="large" />
              </div>
            ))
          )}
        </div>

        {/* Ad Banner - Bottom of Categories */}
        <div className="mt-12">
          <AdBanner page="categories" />
        </div>
      </div>
    </Layout>
  );
};

export default Categories;
