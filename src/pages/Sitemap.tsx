import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import Layout from "@/components/layout/Layout";
import Breadcrumb from "@/components/ui/breadcrumb-nav";
import { useCategories } from "@/hooks/useCategories";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { 
  Book, 
  Grid3X3, 
  FileText, 
  Home, 
  Info, 
  Mail, 
  Shield, 
  ScrollText,
  Download,
  Search,
  User,
  Heart,
  BookOpen,
  ExternalLink,
  Map,
  Settings,
  Library,
  List,
  BarChart3,
  Upload,
  Compass
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.25, 0.1, 0.25, 1] as const }
  }
};

const Sitemap = () => {
  const { data: categories, isLoading: categoriesLoading } = useCategories();
  
  const { data: books, isLoading: booksLoading } = useQuery({
    queryKey: ['sitemap-books'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('books')
        .select('id, title, author, created_at')
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      return data;
    },
  });

  const staticPages = [
    { path: '/', title: 'الصفحة الرئيسية', icon: Home, description: 'استكشف مكتبتنا الرقمية العربية' },
    { path: '/categories', title: 'التصنيفات', icon: Grid3X3, description: 'تصفح الكتب حسب التصنيف' },
    { path: '/search', title: 'البحث', icon: Search, description: 'ابحث عن كتابك المفضل' },
    { path: '/about', title: 'عن المكتبة', icon: Info, description: 'تعرف على قصتنا ورسالتنا' },
    { path: '/contact', title: 'اتصل بنا', icon: Mail, description: 'تواصل معنا لأي استفسار' },
    { path: '/privacy', title: 'سياسة الخصوصية', icon: Shield, description: 'كيف نحمي بياناتك' },
    { path: '/terms', title: 'شروط الاستخدام', icon: ScrollText, description: 'شروط وأحكام الاستخدام' },
    { path: '/install', title: 'تثبيت التطبيق', icon: Download, description: 'حمّل التطبيق على جهازك' },
  ];

  const userPages = [
    { path: '/auth', title: 'تسجيل الدخول', icon: User, description: 'سجّل دخولك أو أنشئ حساب جديد' },
    { path: '/settings', title: 'الإعدادات', icon: Settings, description: 'إدارة حسابك وإعداداتك' },
    { path: '/my-library', title: 'مكتبتي', icon: Library, description: 'الكتب التي رفعتها' },
    { path: '/favorites', title: 'المفضلة', icon: Heart, description: 'كتبك المفضلة' },
    { path: '/saved-books', title: 'الكتب المحفوظة', icon: Download, description: 'الكتب المحفوظة للقراءة لاحقاً' },
    { path: '/reading-lists', title: 'قوائم القراءة', icon: List, description: 'قوائم القراءة الخاصة بك' },
    { path: '/explore-lists', title: 'استكشاف القوائم', icon: Compass, description: 'اكتشف قوائم القراءة العامة' },
    { path: '/stats', title: 'الإحصائيات', icon: BarChart3, description: 'إحصائيات القراءة الخاصة بك' },
    { path: '/upload', title: 'رفع كتاب', icon: Upload, description: 'شارك كتاباً مع المجتمع' },
  ];

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ar-SA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <Layout>
      <Helmet>
        <title>خريطة الموقع | مكتبتي</title>
        <meta name="description" content="خريطة موقع مكتبتي - تصفح جميع صفحات الموقع والكتب والتصنيفات المتاحة" />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href="/sitemap" />
      </Helmet>

      <div className="section-container py-6 sm:py-8 lg:py-12">
        <Breadcrumb items={[{ label: 'خريطة الموقع' }]} />

        {/* Header */}
        <motion.div 
          className="flex items-center gap-3 sm:gap-4 mb-6 sm:mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Map className="w-6 h-6 sm:w-7 sm:h-7 text-primary" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground">
              خريطة الموقع
            </h1>
            <p className="text-sm text-muted-foreground">
              تصفح جميع صفحات الموقع والمحتوى
            </p>
          </div>
        </motion.div>

        <motion.div 
          className="space-y-4 sm:space-y-6"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Static Pages */}
          <motion.div variants={itemVariants}>
            <Card className="border-muted-foreground/10">
              <CardHeader className="pb-3 sm:pb-4">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <FileText className="w-5 h-5 text-primary" />
                  الصفحات الرئيسية
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
                  {staticPages.map((page) => (
                    <Link
                      key={page.path}
                      to={page.path}
                      className="group flex items-start gap-2 sm:gap-3 p-3 rounded-lg bg-muted/50 hover:bg-primary/10 transition-colors"
                    >
                      <page.icon className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground group-hover:text-primary transition-colors mt-0.5 flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <h3 className="font-medium text-foreground group-hover:text-primary transition-colors text-sm sm:text-base">
                          {page.title}
                        </h3>
                        <p className="text-xs sm:text-sm text-muted-foreground line-clamp-1">
                          {page.description}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* User Pages */}
          <motion.div variants={itemVariants}>
            <Card className="border-muted-foreground/10">
              <CardHeader className="pb-3 sm:pb-4">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <User className="w-5 h-5 text-primary" />
                  صفحات المستخدم
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
                  {userPages.map((page) => (
                    <Link
                      key={page.path}
                      to={page.path}
                      className="group flex items-start gap-2 sm:gap-3 p-3 rounded-lg bg-muted/50 hover:bg-primary/10 transition-colors"
                    >
                      <page.icon className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground group-hover:text-primary transition-colors mt-0.5 flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <h3 className="font-medium text-foreground group-hover:text-primary transition-colors text-sm sm:text-base">
                          {page.title}
                        </h3>
                        <p className="text-xs sm:text-sm text-muted-foreground line-clamp-1">
                          {page.description}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Categories */}
          <motion.div variants={itemVariants}>
            <Card className="border-muted-foreground/10">
              <CardHeader className="pb-3 sm:pb-4">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <Grid3X3 className="w-5 h-5 text-primary" />
                  التصنيفات
                  {categories && (
                    <span className="text-xs sm:text-sm font-normal text-muted-foreground">
                      ({categories.length} تصنيف)
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                {categoriesLoading ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3">
                    {[...Array(8)].map((_, i) => (
                      <Skeleton key={i} className="h-12 sm:h-14" />
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3">
                    {categories?.map((category) => (
                      <Link
                        key={category.id}
                        to={`/categories/${category.slug}`}
                        className="group flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-primary/10 transition-colors"
                      >
                        <span className="font-medium text-foreground group-hover:text-primary transition-colors text-sm truncate">
                          {category.name}
                        </span>
                        <span className="text-xs text-muted-foreground flex-shrink-0 mr-2">
                          {category.book_count}
                        </span>
                      </Link>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Recent Books */}
          <motion.div variants={itemVariants}>
            <Card className="border-muted-foreground/10">
              <CardHeader className="pb-3 sm:pb-4">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <Book className="w-5 h-5 text-primary" />
                  أحدث الكتب
                  {books && (
                    <span className="text-xs sm:text-sm font-normal text-muted-foreground">
                      (آخر {books.length} كتاب)
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                {booksLoading ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
                    {[...Array(9)].map((_, i) => (
                      <Skeleton key={i} className="h-16 sm:h-20" />
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
                    {books?.map((book) => (
                      <Link
                        key={book.id}
                        to={`/book/${book.id}`}
                        className="group flex items-start gap-2 sm:gap-3 p-3 rounded-lg bg-muted/50 hover:bg-primary/10 transition-colors"
                      >
                        <Book className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground group-hover:text-primary transition-colors mt-0.5 flex-shrink-0" />
                        <div className="min-w-0 flex-1">
                          <h3 className="font-medium text-foreground group-hover:text-primary transition-colors text-sm line-clamp-1">
                            {book.title}
                          </h3>
                          <p className="text-xs text-muted-foreground line-clamp-1">
                            {book.author}
                          </p>
                          <p className="text-[10px] sm:text-xs text-muted-foreground/70 mt-0.5">
                            {formatDate(book.created_at)}
                          </p>
                        </div>
                        <ExternalLink className="w-3 h-3 sm:w-4 sm:h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                      </Link>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* XML Sitemap Links */}
          <motion.div variants={itemVariants}>
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="p-4 sm:p-6 text-center">
                <p className="text-muted-foreground text-sm mb-3">
                  للمطورين ومحركات البحث - آخر تحديث: {new Date().toLocaleDateString('ar-SA')}
                </p>
                <div className="flex flex-wrap justify-center gap-3 sm:gap-4">
                  <a 
                    href="/sitemap.xml" 
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-primary hover:underline text-sm"
                  >
                    <FileText className="w-4 h-4" />
                    sitemap.xml (ثابت)
                    <ExternalLink className="w-3 h-3" />
                  </a>
                  <a 
                    href="https://cewfumpyturqseqyonwb.supabase.co/functions/v1/generate-sitemap" 
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-emerald-600 dark:text-emerald-400 hover:underline text-sm"
                  >
                    <FileText className="w-4 h-4" />
                    sitemap.xml (ديناميكي - يتحدث تلقائياً)
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <p className="text-xs text-muted-foreground mt-3">
                  الخريطة الديناميكية تتحدث تلقائياً عند إضافة أو حذف الكتب والتصنيفات
                </p>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      </div>
    </Layout>
  );
};

export default Sitemap;