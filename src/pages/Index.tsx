import { useState, memo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, TrendingUp, Sparkles, BookOpen, Search, Library } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { motion } from "framer-motion";
import Layout from "@/components/layout/Layout";
import BookCard from "@/components/books/BookCard";
import AdBanner from "@/components/ads/AdBanner";
import RecommendedBooks from "@/components/books/RecommendedBooks";
import { useCachedFeaturedBooks, useCachedLatestBooks, useCachedBooksRealtime } from "@/hooks/useCachedBooks";
import { useBookRecommendations } from "@/hooks/useRecommendations";
import { BookCardSkeleton } from "@/components/ui/loading-skeleton";
import DamascusPattern from "@/components/ui/damascus-pattern";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useReadingStats } from "@/hooks/useReadingStats";
import { useSEO } from "@/hooks/useSEO";
import { useOnlineStatus } from "@/hooks/useOfflineStorage";
import { useHomeSettings, useSearchSettings, useSeoSettings, useGeneralSettings } from "@/hooks/useSiteSettings";
import OrganizationJsonLd from "@/components/seo/OrganizationJsonLd";

// Simplified animations for better performance
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.03,
      delayChildren: 0.02,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: "tween" as const,
      duration: 0.2,
    },
  },
};

const Index = () => {
  // Enable realtime updates for books (only when online)
  useCachedBooksRealtime();
  const isOnline = useOnlineStatus();
  const isMobile = useIsMobile();

  const { user } = useAuth();
  const { data: stats, isLoading: statsLoading } = useReadingStats();
  const shouldShowRecommendations = isOnline && !!user && !statsLoading && !!stats && stats.total_books_read >= 20;

  const { data: featuredBooks, isLoading: featuredLoading } = useCachedFeaturedBooks();
  const { data: latestBooks, isLoading: latestLoading } = useCachedLatestBooks();
  const { data: recommendedBooks, isLoading: recommendedLoading } = useBookRecommendations(5);
  
  // Show personalized section only if user has reading history
  const hasReadingHistory = !!user && !statsLoading && !!stats && stats.total_books_read > 0;
  const showPersonalizedBooks = hasReadingHistory && recommendedBooks && recommendedBooks.length > 0;
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const navigate = useNavigate();
  
  // جلب إعدادات الموقع
  const { data: homeSettings } = useHomeSettings();

  // SEO for homepage
  useSEO({
    title: 'مكتبة - مكتبتك الرقمية العربية المجانية',
    description: 'من غرفة صغيرة للعالم العربي كله. اكتشف آلاف الكتب العربية المجانية للقراءة والتحميل. نوفر الكتب للمحرومين من المعرفة بسبب الحرب.',
    keywords: 'مكتبة عربية، كتب مجانية، كتب PDF، مكتبة رقمية، كتب عربية، تحميل كتب، قراءة كتب، كتب إلكترونية، مكتبة إلكترونية، كتب أونلاين، تحميل كتب PDF مجانا، أفضل الكتب العربية، كتب للقراءة، مكتبة مجانية',
    url: 'https://maktaba.cc/',
    type: 'website',
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      navigate('/search');
    }
  };

  return (
    <Layout>
      {/* JSON-LD Structured Data */}
      <OrganizationJsonLd />
      
      <>
      {/* Hero Section - 2026 Modern Design */}
      {homeSettings?.showHeroBanner && (
      <section className="py-10 lg:py-20 bg-background dark-section-fade-bottom relative overflow-hidden">
        {/* Mesh gradient background - Hidden on mobile for performance */}
        <div className="absolute inset-0 mesh-gradient-bg hidden sm:block" />
        
        {/* Static gradient orbs - No animation for better performance */}
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-primary/10 rounded-full blur-3xl opacity-30 hidden lg:block" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-secondary/10 rounded-full blur-3xl opacity-30 hidden lg:block" />

        <div className="section-container relative z-10">
          <motion.div
            className="relative overflow-hidden"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            {/* Static Damascus Patterns - No animation for better performance */}
            <div className="absolute top-0 right-0 w-32 h-32 hidden sm:block">
              <DamascusPattern className="w-full h-full text-primary opacity-10 dark:opacity-15" />
            </div>
            <div className="absolute bottom-0 left-0 w-28 h-28 hidden sm:block">
              <DamascusPattern className="w-full h-full text-secondary opacity-10 dark:opacity-15" />
            </div>
            <div className="absolute top-1/4 left-8 w-20 h-20 hidden lg:block">
              <DamascusPattern className="w-full h-full text-primary opacity-5 dark:opacity-10" />
            </div>

            <div className="max-w-3xl mx-auto text-center relative z-10 space-y-6 sm:space-y-10 py-4 sm:py-6">

              {/* Main Title with gradient - Smaller on mobile */}
              <motion.div variants={itemVariants} className="space-y-2 sm:space-y-3">
                <h1 className="text-4xl sm:text-6xl lg:text-8xl font-extrabold">
                  <span className="gradient-text">{homeSettings?.heroTitle || 'مكتبة'}</span>
                </h1>
                <motion.p
                  className="text-base sm:text-xl lg:text-2xl text-muted-foreground font-medium px-4 sm:px-0"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                >
                  {homeSettings?.heroSubtitle || 'بوابتك إلى عالم المعرفة العربية'}
                </motion.p>
              </motion.div>

              {/* Search Bar - Simplified on mobile */}
              <motion.form
                onSubmit={handleSearch}
                variants={itemVariants}
                className="relative max-w-xl mx-auto px-4 sm:px-0"
              >
                {/* Glow effect - hidden on mobile */}
                <div
                  className={`absolute -inset-1 bg-gradient-to-r from-primary/40 via-secondary/40 to-primary/40 rounded-3xl blur-lg transition-opacity duration-300 hidden sm:block ${
                    isSearchFocused ? "opacity-100" : "opacity-0"
                  }`}
                />
                <div className="relative bg-muted/60 sm:glass-card rounded-2xl p-1 sm:p-1.5">
                  <div className="relative flex items-center">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onFocus={() => setIsSearchFocused(true)}
                      onBlur={() => setIsSearchFocused(false)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          if (searchQuery.trim()) {
                            navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
                          } else {
                            navigate('/search');
                          }
                        }
                      }}
                      placeholder="ابحث عن كتاب..."
                      className="w-full h-12 sm:h-14 lg:h-16 px-4 sm:px-6 pr-4 sm:pr-6 pl-14 sm:pl-16 text-base lg:text-lg bg-transparent text-foreground rounded-xl focus:outline-none placeholder:text-muted-foreground cursor-pointer"
                    />
                    <motion.button
                      type="submit"
                      className="absolute left-1.5 sm:left-2 w-10 h-10 sm:w-12 sm:h-12 lg:w-13 lg:h-13 bg-gradient-to-br from-primary to-primary/85 text-primary-foreground rounded-xl flex items-center justify-center shadow-md active:scale-95 transition-transform touch-manipulation"
                      whileTap={{ scale: 0.95 }}
                      aria-label="بحث"
                    >
                      <Search className="w-5 h-5 lg:w-6 lg:h-6" />
                    </motion.button>
                  </div>
                </div>
              </motion.form>

              {/* CTA Buttons - Side by side on all screens */}
              <motion.div
                variants={itemVariants}
                className="flex flex-row items-center justify-center gap-2 sm:gap-4 px-4 sm:px-0"
              >
                <Button
                  asChild
                  size="lg"
                  className="flex-1 sm:flex-none bg-primary text-primary-foreground font-bold px-3 sm:px-8 shadow-md h-11 sm:h-14 text-sm sm:text-base"
                >
                  <Link to="/categories" className="flex items-center justify-center gap-1.5 sm:gap-2">
                    <span>تصفح التصنيفات</span>
                    <span className="rtl-flip">
                      <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
                    </span>
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  size="lg"
                  className="flex-1 sm:flex-none font-bold h-11 sm:h-14 text-sm sm:text-base px-3 sm:px-8"
                >
                  <Link to="/search" className="flex items-center justify-center gap-1.5 sm:gap-2">
                    <Search className="w-4 h-4 sm:w-5 sm:h-5" />
                    <span>البحث المتقدم</span>
                  </Link>
                </Button>
              </motion.div>


            </div>
          </motion.div>
        </div>
      </section>
      )}

      {/* Recommended Books Section - Only after reading 20+ books */}
      {shouldShowRecommendations && homeSettings?.showPopularBooks && (
        <section className="py-12 lg:py-16 bg-muted/30 relative overflow-hidden">
          <div className="section-container relative z-10">
            <RecommendedBooks />
          </div>
        </section>
      )}

      {/* Featured Books Section - Shows personalized recommendations if user has reading history, or featured books otherwise */}
      {homeSettings?.showFeaturedBooks && (showPersonalizedBooks || (featuredBooks && featuredBooks.length > 0)) && (
      <section className="py-8 sm:py-12 lg:py-16 bg-background dark-section-fade-top dark-section-fade-bottom relative overflow-hidden">
        {/* Subtle mesh gradient - Hidden on mobile */}
        <div className="absolute inset-0 mesh-gradient-bg opacity-50 hidden sm:block" />
        
        <div className="section-container relative z-10">
          <motion.div
            className="relative overflow-hidden"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
            variants={containerVariants}
          >
            {/* Static pattern - Hidden on mobile */}
            <div className="absolute top-0 right-0 w-24 h-24 hidden sm:block">
              <DamascusPattern className="w-full h-full text-primary opacity-10 dark:opacity-15" />
            </div>

            {/* Header - Smaller on mobile */}
            <motion.div variants={itemVariants} className="flex items-center justify-between mb-6 sm:mb-10 relative z-10">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="relative bg-gradient-to-br from-primary to-primary/80 w-10 h-10 sm:w-12 sm:h-12 lg:w-14 lg:h-14 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-glow">
                  <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 lg:w-7 lg:h-7 text-primary-foreground" />
                </div>
                <div>
                  <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground">
                    {showPersonalizedBooks ? 'موصى لك' : 'كتب مميزة'}
                  </h2>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    {showPersonalizedBooks ? 'بناءً على قراءاتك السابقة' : 'أفضل الكتب المختارة'}
                  </p>
                </div>
              </div>
              <Link
                to={showPersonalizedBooks ? "/my-library" : "/categories"}
                className="flex items-center gap-1.5 sm:gap-2 text-primary font-semibold text-xs sm:text-sm bg-primary/10 border border-primary/30 px-3 sm:px-5 py-2 sm:py-2.5 rounded-lg sm:rounded-xl hover:bg-primary/20 hover:border-primary/50 transition-all whitespace-nowrap flex-shrink-0"
              >
                <span>{showPersonalizedBooks ? 'مكتبتي' : 'عرض الكل'}</span>
                <ArrowLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4 rtl-flip flex-shrink-0" />
              </Link>
            </motion.div>

            {/* Books Grid - Better mobile spacing */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-5 lg:gap-6 relative z-10">
              {showPersonalizedBooks ? (
                recommendedLoading
                  ? Array.from({ length: isMobile ? 4 : 5 }).map((_, i) => <BookCardSkeleton key={i} />)
                  : recommendedBooks?.slice(0, isMobile ? 4 : 5)?.map((book, index) => (
                      <motion.div
                        key={book.id}
                        variants={itemVariants}
                        custom={index}
                      >
                        <BookCard book={book as any} />
                      </motion.div>
                    ))
              ) : (
                featuredLoading
                  ? Array.from({ length: 4 }).map((_, i) => <BookCardSkeleton key={i} />)
                  : featuredBooks?.slice(0, isMobile ? 4 : undefined)?.map((book, index) => (
                      <motion.div
                        key={book.id}
                        variants={itemVariants}
                        custom={index}
                      >
                        <BookCard book={book} />
                      </motion.div>
                    ))
              )}
            </div>
          </motion.div>
        </div>
      </section>
      )}

      {/* Ad Banner Section */}
      <section className="py-8 sm:py-12 lg:py-16 bg-muted/20 dark-section-fade-top dark-section-fade-bottom relative overflow-hidden">
        <div className="section-container">
          <AdBanner page="home" />
        </div>
      </section>

      {/* Latest Books Section - Shows by default if settings not loaded or enabled */}
      {(homeSettings?.showLatestBooks !== false) && latestBooks && latestBooks.length > 0 && (
      <section className="py-8 sm:py-12 lg:py-16 bg-background dark-section-fade-top dark-section-fade-bottom relative overflow-hidden">
        <div className="section-container relative z-10">
          <motion.div
            className="relative overflow-hidden"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={containerVariants}
          >
            {/* Static pattern - Hidden on mobile */}
            <div className="absolute top-0 left-0 w-24 h-24 hidden sm:block">
              <DamascusPattern className="w-full h-full text-primary opacity-10 dark:opacity-15" />
            </div>

            {/* Header - Smaller on mobile */}
            <motion.div variants={itemVariants} className="flex items-center justify-between mb-6 sm:mb-10 relative z-10">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="relative bg-gradient-to-br from-secondary to-secondary/80 w-10 h-10 sm:w-12 sm:h-12 lg:w-14 lg:h-14 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-glow">
                  <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 lg:w-7 lg:h-7 text-secondary-foreground" />
                </div>
                <div>
                  <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground">أحدث الإضافات</h2>
                  <p className="text-xs sm:text-sm text-muted-foreground">كتب جديدة أضيفت مؤخراً</p>
                </div>
              </div>
              <Link
                to="/categories"
                className="flex items-center gap-1.5 sm:gap-2 text-primary font-semibold text-xs sm:text-sm bg-primary/10 border border-primary/30 px-3 sm:px-5 py-2 sm:py-2.5 rounded-lg sm:rounded-xl hover:bg-primary/20 hover:border-primary/50 transition-all whitespace-nowrap flex-shrink-0"
              >
                <span>عرض الكل</span>
                <ArrowLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4 rtl-flip flex-shrink-0" />
              </Link>
            </motion.div>

            {/* Books Grid - Better mobile spacing */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-5 lg:gap-6 relative z-10">
              {latestLoading
                ? Array.from({ length: isMobile ? 4 : 5 }).map((_, i) => <BookCardSkeleton key={i} />)
                : latestBooks?.slice(0, isMobile ? 4 : undefined)?.map((book, index) => (
                    <motion.div
                      key={book.id}
                      variants={itemVariants}
                      custom={index}
                    >
                      <BookCard book={book} />
                    </motion.div>
                  ))}
            </div>
          </motion.div>
        </div>
      </section>
      )}

      {/* Mission Section with glassmorphism */}
      <section className="py-8 sm:py-12 lg:py-16 bg-muted/30 dark-section-fade-top relative overflow-hidden">
        {/* Background elements - Hidden on mobile */}
        <div className="absolute inset-0 mesh-gradient-bg opacity-50 hidden sm:block" />

        <div className="section-container relative z-10">
          <motion.div
            className="relative overflow-hidden"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={containerVariants}
          >
            {/* Static patterns - Hidden on mobile */}
            <div className="absolute top-0 right-0 w-24 h-24 hidden sm:block">
              <DamascusPattern className="w-full h-full text-primary opacity-10" />
            </div>
            <div className="absolute bottom-0 left-0 w-20 h-20 hidden sm:block">
              <DamascusPattern className="w-full h-full text-secondary opacity-10" />
            </div>

            <motion.div variants={itemVariants} className="max-w-2xl mx-auto text-center relative z-10 px-2 sm:px-0 pt-6 sm:pt-8">
              <div className="relative bg-gradient-to-br from-primary to-primary/80 w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 rounded-xl sm:rounded-2xl flex items-center justify-center mx-auto mb-6 sm:mb-8 shadow-glow-lg">
                <BookOpen className="w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8 text-primary-foreground" />
              </div>
              <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground mb-3 sm:mb-4">رسالتنا</h2>
              <p className="text-sm sm:text-base lg:text-lg text-muted-foreground leading-relaxed-ar bg-card/80 border border-border/50 p-4 sm:p-6 rounded-xl sm:rounded-2xl">
                نؤمن بأن المعرفة حق للجميع. بدأنا من غرفة صغيرة، وحلمنا أن نوصل الكتب العربية لكل قارئ في العالم العربي
                مجاناً. نعمل على جمع وتنظيم الكتب المجانية والمفتوحة المصدر لتكون في متناول يدك.
              </p>
            </motion.div>
          </motion.div>
        </div>
      </section>
      </>
    </Layout>
  );
};

export default Index;
