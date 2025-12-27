import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { 
  ArrowRight, Loader2, Save, Trash2, Eye, Download, Star, MessageSquare, 
  Flag, BookOpen, Calendar, User, FileText, BarChart3, Globe, Hash, 
  Building, Image, Upload, AlertTriangle
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useActivityLog } from '@/hooks/useActivityLog';
import { useAdminCategories } from '@/hooks/useAdmin';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

export const AdminBookDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { logActivity } = useActivityLog();
  const queryClient = useQueryClient();
  const { data: categories } = useAdminCategories();
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [activeTab, setActiveTab] = useState('info');
  const [reviewsPage, setReviewsPage] = useState(1);
  const reviewsPerPage = 5;

  // Fetch book details
  const { data: book, isLoading: bookLoading } = useQuery({
    queryKey: ['adminBookDetails', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('books')
        .select('*, categories(*)')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  // Fetch book reviews
  const { data: reviews, isLoading: reviewsLoading } = useQuery({
    queryKey: ['adminBookReviews', id],
    queryFn: async () => {
      // First get the reviews
      const { data: reviewsData, error: reviewsError } = await supabase
        .from('book_reviews')
        .select('*')
        .eq('book_id', id)
        .order('created_at', { ascending: false });
      
      if (reviewsError) throw reviewsError;
      if (!reviewsData || reviewsData.length === 0) return [];

      // Get unique user IDs
      const userIds = [...new Set(reviewsData.map(r => r.user_id))];
      
      // Fetch profiles separately
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, username, avatar_url')
        .in('id', userIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
      
      return reviewsData.map(review => ({
        ...review,
        profiles: profileMap.get(review.user_id) || null
      }));
    },
    enabled: !!id,
  });

  // Fetch book reports
  const { data: reports, isLoading: reportsLoading } = useQuery({
    queryKey: ['adminBookReports', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('content_reports')
        .select('*')
        .eq('content_type', 'book')
        .eq('content_id', id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  // Fetch reading progress stats
  const { data: readingStats } = useQuery({
    queryKey: ['adminBookReadingStats', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('reading_progress')
        .select('*')
        .eq('book_id', id);
      if (error) throw error;
      
      const totalReaders = data?.length || 0;
      const completedReaders = data?.filter(r => r.is_completed).length || 0;
      const avgProgress = totalReaders > 0 
        ? Math.round(data.reduce((sum, r) => sum + (r.current_page / (r.total_pages || 1) * 100), 0) / totalReaders)
        : 0;
      
      return { totalReaders, completedReaders, avgProgress };
    },
    enabled: !!id,
  });

  // Fetch favorites count
  const { data: favoritesCount } = useQuery({
    queryKey: ['adminBookFavorites', id],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('favorites')
        .select('*', { count: 'exact', head: true })
        .eq('book_id', id);
      if (error) throw error;
      return count || 0;
    },
    enabled: !!id,
  });

  // Fetch uploader info
  const { data: uploader } = useQuery({
    queryKey: ['adminBookUploader', book?.uploaded_by],
    queryFn: async () => {
      if (!book?.uploaded_by) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, username, avatar_url')
        .eq('id', book.uploaded_by)
        .single();
      if (error) return null;
      return data;
    },
    enabled: !!book?.uploaded_by,
  });

  const [formData, setFormData] = useState<any>(null);

  // Initialize form data when book loads
  if (book && !formData) {
    setFormData({
      title: book.title || '',
      author: book.author || '',
      description: book.description || '',
      category_id: book.category_id || '',
      cover_url: book.cover_url || '',
      file_url: book.file_url || '',
      file_size: book.file_size || '',
      pages: book.pages?.toString() || '',
      publish_year: book.publish_year?.toString() || '',
      publisher: book.publisher || '',
      isbn: book.isbn || '',
      language: book.language || 'ar',
      is_featured: book.is_featured ?? false,
    });
  }

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingCover(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `covers/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('maktaba')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('maktaba')
        .getPublicUrl(fileName);

      setFormData((prev: any) => ({ ...prev, cover_url: publicUrl }));
      toast.success('تم رفع الغلاف بنجاح');
    } catch (error: any) {
      toast.error(error.message || 'حدث خطأ أثناء رفع الغلاف');
    } finally {
      setIsUploadingCover(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingFile(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `books/${Date.now()}.${fileExt}`;
      const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);

      const { error: uploadError } = await supabase.storage
        .from('maktaba')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('maktaba')
        .getPublicUrl(fileName);

      setFormData((prev: any) => ({ 
        ...prev, 
        file_url: publicUrl,
        file_size: `${fileSizeMB} MB`
      }));
      toast.success('تم رفع الملف بنجاح');
    } catch (error: any) {
      toast.error(error.message || 'حدث خطأ أثناء رفع الملف');
    } finally {
      setIsUploadingFile(false);
    }
  };

  const handleSave = async () => {
    if (!formData?.title || !formData?.author) {
      toast.error('يرجى ملء الحقول المطلوبة');
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('books')
        .update({
          title: formData.title,
          author: formData.author,
          description: formData.description || null,
          category_id: formData.category_id || null,
          cover_url: formData.cover_url || null,
          file_url: formData.file_url || null,
          file_size: formData.file_size || null,
          pages: formData.pages ? parseInt(formData.pages) : null,
          publish_year: formData.publish_year ? parseInt(formData.publish_year) : null,
          publisher: formData.publisher || null,
          isbn: formData.isbn || null,
          language: formData.language,
          is_featured: formData.is_featured,
        })
        .eq('id', id);

      if (error) throw error;

      logActivity({
        actionType: 'update',
        entityType: 'book',
        entityId: id,
        entityName: formData.title,
      });

      toast.success('تم حفظ التغييرات بنجاح');
      queryClient.invalidateQueries({ queryKey: ['adminBookDetails', id] });
      queryClient.invalidateQueries({ queryKey: ['adminBooks'] });
    } catch (error: any) {
      toast.error(error.message || 'حدث خطأ أثناء الحفظ');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteReview = async (reviewId: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا التعليق؟')) return;

    try {
      const { error } = await supabase.from('book_reviews').delete().eq('id', reviewId);
      if (error) throw error;

      logActivity({
        actionType: 'delete',
        entityType: 'review',
        entityId: reviewId,
        entityName: `تعليق على كتاب: ${book?.title}`,
      });

      toast.success('تم حذف التعليق بنجاح');
      queryClient.invalidateQueries({ queryKey: ['adminBookReviews', id] });
    } catch (error: any) {
      toast.error(error.message || 'حدث خطأ أثناء الحذف');
    }
  };

  const handleResolveReport = async (reportId: string) => {
    try {
      const { error } = await supabase
        .from('content_reports')
        .update({ 
          status: 'resolved',
          reviewed_at: new Date().toISOString(),
          reviewed_by: user?.id
        })
        .eq('id', reportId);

      if (error) throw error;
      toast.success('تم تحديث حالة البلاغ');
      queryClient.invalidateQueries({ queryKey: ['adminBookReports', id] });
    } catch (error: any) {
      toast.error(error.message || 'حدث خطأ');
    }
  };

  const handleDeleteBook = async () => {
    if (!confirm('هل أنت متأكد من حذف هذا الكتاب نهائيا؟ لا يمكن التراجع عن هذا الإجراء.')) return;

    try {
      const { error } = await supabase.from('books').delete().eq('id', id);
      if (error) throw error;

      logActivity({
        actionType: 'delete',
        entityType: 'book',
        entityId: id,
        entityName: book?.title,
      });

      toast.success('تم حذف الكتاب بنجاح');
      navigate('/admin/books');
    } catch (error: any) {
      toast.error(error.message || 'حدث خطأ أثناء الحذف');
    }
  };

  const getReasonLabel = (reason: string) => {
    const reasons: Record<string, string> = {
      'inappropriate': 'محتوى غير لائق',
      'copyright': 'انتهاك حقوق النشر',
      'spam': 'إزعاج / سبام',
      'wrong_category': 'تصنيف خاطئ',
      'poor_quality': 'جودة رديئة',
      'other': 'سبب آخر',
    };
    return reasons[reason] || reason;
  };

  // Paginate reviews - must be before any early returns
  const totalReviewsPages = Math.ceil((reviews?.length || 0) / reviewsPerPage);
  const paginatedReviews = useMemo(() => {
    if (!reviews) return [];
    const start = (reviewsPage - 1) * reviewsPerPage;
    return reviews.slice(start, start + reviewsPerPage);
  }, [reviews, reviewsPage]);

  const avgRating = reviews?.length 
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : '0';

  if (bookLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  if (!book) {
    return (
      <AdminLayout>
        <div className="text-center py-20">
          <p className="text-muted-foreground">الكتاب غير موجود</p>
          <Button onClick={() => navigate('/admin/books')} className="mt-4">
            العودة للكتب
          </Button>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/admin/books')}>
              <ArrowRight className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">{book.title}</h1>
              <p className="text-muted-foreground">{book.author}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" asChild>
              <a href={`/book/${book.id}`} target="_blank">
                <Eye className="w-4 h-4 ml-2" />
                معاينة
              </a>
            </Button>
            <Button onClick={handleSave} disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="w-4 h-4 ml-2 animate-spin" /> : <Save className="w-4 h-4 ml-2" />}
              حفظ التغييرات
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <Eye className="w-6 h-6 mx-auto mb-2 text-muted-foreground" />
              <p className="text-2xl font-bold">{book.view_count}</p>
              <p className="text-xs text-muted-foreground">مشاهدة</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Download className="w-6 h-6 mx-auto mb-2 text-muted-foreground" />
              <p className="text-2xl font-bold">{book.download_count}</p>
              <p className="text-xs text-muted-foreground">تحميل</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Star className="w-6 h-6 mx-auto mb-2 text-yellow-500" />
              <p className="text-2xl font-bold">{avgRating}</p>
              <p className="text-xs text-muted-foreground">{reviews?.length || 0} تقييم</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <BookOpen className="w-6 h-6 mx-auto mb-2 text-muted-foreground" />
              <p className="text-2xl font-bold">{readingStats?.totalReaders || 0}</p>
              <p className="text-xs text-muted-foreground">قارئ</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Star className="w-6 h-6 mx-auto mb-2 text-red-500" />
              <p className="text-2xl font-bold">{favoritesCount}</p>
              <p className="text-xs text-muted-foreground">مفضلة</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid grid-cols-4 w-full max-w-lg">
            <TabsTrigger value="info">المعلومات</TabsTrigger>
            <TabsTrigger value="reviews" className="gap-1">
              التعليقات
              {reviews && reviews.length > 0 && (
                <Badge variant="secondary" className="text-xs mr-1">{reviews.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="reports" className="gap-1">
              البلاغات
              {reports && reports.filter(r => r.status === 'pending').length > 0 && (
                <Badge variant="destructive" className="text-xs mr-1">
                  {reports.filter(r => r.status === 'pending').length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="stats">الإحصائيات</TabsTrigger>
          </TabsList>

          {/* Info Tab */}
          <TabsContent value="info" className="space-y-6">
            <div className="grid md:grid-cols-3 gap-6">
              {/* Cover & File */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">الغلاف والملف</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Cover */}
                  <div className="text-center">
                    {formData?.cover_url ? (
                      <img
                        src={formData.cover_url}
                        alt={book.title}
                        className="w-32 h-44 object-cover rounded-lg mx-auto shadow-lg"
                      />
                    ) : (
                      <div className="w-32 h-44 bg-muted rounded-lg mx-auto flex items-center justify-center">
                        <Image className="w-10 h-10 text-muted-foreground" />
                      </div>
                    )}
                    <label className="mt-3 inline-block">
                      <Button variant="outline" size="sm" className="gap-2" asChild>
                        <span>
                          {isUploadingCover ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                          تغيير الغلاف
                        </span>
                      </Button>
                      <input type="file" accept="image/*" className="hidden" onChange={handleCoverUpload} disabled={isUploadingCover} />
                    </label>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>رابط الغلاف</Label>
                    <Input
                      value={formData?.cover_url || ''}
                      onChange={(e) => setFormData({ ...formData, cover_url: e.target.value })}
                      placeholder="رابط الغلاف"
                    />
                  </div>

                  {/* File */}
                  <div className="space-y-2 pt-4 border-t">
                    <Label>ملف الكتاب (PDF)</Label>
                    <Input
                      value={formData?.file_url || ''}
                      onChange={(e) => setFormData({ ...formData, file_url: e.target.value })}
                      placeholder="رابط الملف"
                    />
                    <div className="flex gap-2">
                      <label className="flex-1">
                        <Button variant="outline" size="sm" className="w-full gap-2" asChild>
                          <span>
                            {isUploadingFile ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                            رفع ملف جديد
                          </span>
                        </Button>
                        <input type="file" accept=".pdf" className="hidden" onChange={handleFileUpload} disabled={isUploadingFile} />
                      </label>
                      {formData?.file_url && (
                        <Button variant="outline" size="sm" asChild>
                          <a href={formData.file_url} target="_blank">
                            <Download className="w-4 h-4" />
                          </a>
                        </Button>
                      )}
                    </div>
                    {formData?.file_size && (
                      <p className="text-xs text-muted-foreground">الحجم: {formData.file_size}</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Main Info */}
              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle className="text-lg">المعلومات الأساسية</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>العنوان *</Label>
                      <Input
                        value={formData?.title || ''}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>المؤلف *</Label>
                      <Input
                        value={formData?.author || ''}
                        onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>الوصف</Label>
                    <Textarea
                      value={formData?.description || ''}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      rows={4}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>التصنيف</Label>
                      <Select
                        value={formData?.category_id || ''}
                        onValueChange={(value) => setFormData({ ...formData, category_id: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="اختر التصنيف" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories?.map((cat) => (
                            <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>اللغة</Label>
                      <Select
                        value={formData?.language || 'ar'}
                        onValueChange={(value) => setFormData({ ...formData, language: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ar">العربية</SelectItem>
                          <SelectItem value="en">الإنجليزية</SelectItem>
                          <SelectItem value="fr">الفرنسية</SelectItem>
                          <SelectItem value="de">الألمانية</SelectItem>
                          <SelectItem value="es">الإسبانية</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>عدد الصفحات</Label>
                      <Input
                        type="number"
                        value={formData?.pages || ''}
                        onChange={(e) => setFormData({ ...formData, pages: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>سنة النشر</Label>
                      <Input
                        type="number"
                        value={formData?.publish_year || ''}
                        onChange={(e) => setFormData({ ...formData, publish_year: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>ISBN</Label>
                      <Input
                        value={formData?.isbn || ''}
                        onChange={(e) => setFormData({ ...formData, isbn: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>الناشر</Label>
                    <Input
                      value={formData?.publisher || ''}
                      onChange={(e) => setFormData({ ...formData, publisher: e.target.value })}
                    />
                  </div>

                  <div className="flex items-center gap-4 pt-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData?.is_featured || false}
                        onChange={(e) => setFormData({ ...formData, is_featured: e.target.checked })}
                        className="rounded"
                      />
                      <Star className="w-4 h-4 text-yellow-500" />
                      <span className="text-sm">كتاب مميز</span>
                    </label>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Uploader Info & Danger Zone */}
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <User className="w-5 h-5" />
                    معلومات الرافع
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {uploader ? (
                    <div className="flex items-center gap-4">
                      {uploader.avatar_url ? (
                        <img src={uploader.avatar_url} alt="" className="w-12 h-12 rounded-full" />
                      ) : (
                        <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center">
                          <User className="w-6 h-6 text-muted-foreground" />
                        </div>
                      )}
                      <div>
                        <p className="font-medium">{uploader.full_name || 'بدون اسم'}</p>
                        {uploader.username && <p className="text-sm text-muted-foreground">@{uploader.username}</p>}
                      </div>
                    </div>
                  ) : (
                    <p className="text-muted-foreground">غير معروف</p>
                  )}
                  <div className="mt-4 pt-4 border-t text-sm text-muted-foreground space-y-1">
                    <p className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      تاريخ الإضافة: {format(new Date(book.created_at), 'dd MMMM yyyy', { locale: ar })}
                    </p>
                    <p className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      آخر تحديث: {format(new Date(book.updated_at), 'dd MMMM yyyy', { locale: ar })}
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-destructive">
                <CardHeader>
                  <CardTitle className="text-lg text-destructive flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5" />
                    منطقة الخطر
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    حذف الكتاب سيؤدي إلى إزالته نهائيا مع جميع التعليقات والإحصائيات المرتبطة به.
                  </p>
                  <Button variant="destructive" onClick={handleDeleteBook} className="w-full gap-2">
                    <Trash2 className="w-4 h-4" />
                    حذف الكتاب نهائيا
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Reviews Tab */}
          <TabsContent value="reviews">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <MessageSquare className="w-5 h-5" />
                    التعليقات والتقييمات
                  </span>
                  <Badge variant="secondary">{reviews?.length || 0} تعليق</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {reviewsLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin" />
                  </div>
                ) : reviews && reviews.length > 0 ? (
                  <div className="space-y-4">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>المستخدم</TableHead>
                          <TableHead>التقييم</TableHead>
                          <TableHead>التعليق</TableHead>
                          <TableHead>التاريخ</TableHead>
                          <TableHead>الإجراءات</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paginatedReviews.map((review: any) => (
                          <TableRow key={review.id}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {review.profiles?.avatar_url ? (
                                  <img src={review.profiles.avatar_url} alt="" className="w-8 h-8 rounded-full" />
                                ) : (
                                  <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center">
                                    <User className="w-4 h-4" />
                                  </div>
                                )}
                                <span className="text-sm">{review.profiles?.full_name || review.profiles?.username || 'مجهول'}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                {[1, 2, 3, 4, 5].map((star) => (
                                  <Star
                                    key={star}
                                    className={`w-4 h-4 ${star <= review.rating ? 'fill-yellow-500 text-yellow-500' : 'text-muted'}`}
                                  />
                                ))}
                              </div>
                            </TableCell>
                            <TableCell className="max-w-xs">
                              <p className="text-sm truncate">{review.review_text || '-'}</p>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {format(new Date(review.created_at), 'dd/MM/yyyy', { locale: ar })}
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDeleteReview(review.id)}
                                className="text-destructive hover:text-destructive"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    
                    {/* Pagination */}
                    {totalReviewsPages > 1 && (
                      <div className="flex items-center justify-between border-t pt-4">
                        <p className="text-sm text-muted-foreground">
                          عرض {((reviewsPage - 1) * reviewsPerPage) + 1} - {Math.min(reviewsPage * reviewsPerPage, reviews.length)} من {reviews.length}
                        </p>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setReviewsPage(p => Math.max(1, p - 1))}
                            disabled={reviewsPage === 1}
                          >
                            السابق
                          </Button>
                          <span className="text-sm px-3">
                            {reviewsPage} / {totalReviewsPages}
                          </span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setReviewsPage(p => Math.min(totalReviewsPages, p + 1))}
                            disabled={reviewsPage === totalReviewsPages}
                          >
                            التالي
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>لا توجد تعليقات حتى الآن</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Reports Tab */}
          <TabsContent value="reports">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Flag className="w-5 h-5" />
                    البلاغات
                  </span>
                  <Badge variant={reports?.some(r => r.status === 'pending') ? 'destructive' : 'secondary'}>
                    {reports?.filter(r => r.status === 'pending').length || 0} بلاغ معلق
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {reportsLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin" />
                  </div>
                ) : reports && reports.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>السبب</TableHead>
                        <TableHead>الوصف</TableHead>
                        <TableHead>الحالة</TableHead>
                        <TableHead>التاريخ</TableHead>
                        <TableHead>الإجراءات</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reports.map((report) => (
                        <TableRow key={report.id}>
                          <TableCell>
                            <Badge variant="outline">{getReasonLabel(report.reason)}</Badge>
                          </TableCell>
                          <TableCell className="max-w-xs">
                            <p className="text-sm truncate">{report.description || '-'}</p>
                          </TableCell>
                          <TableCell>
                            <Badge variant={report.status === 'pending' ? 'destructive' : 'secondary'}>
                              {report.status === 'pending' ? 'معلق' : report.status === 'resolved' ? 'تم الحل' : 'مرفوض'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {format(new Date(report.created_at), 'dd/MM/yyyy', { locale: ar })}
                          </TableCell>
                          <TableCell>
                            {report.status === 'pending' && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleResolveReport(report.id)}
                              >
                                حل البلاغ
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Flag className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>لا توجد بلاغات على هذا الكتاب</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Stats Tab */}
          <TabsContent value="stats">
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5" />
                    إحصائيات القراءة
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center p-4 bg-muted rounded-lg">
                      <p className="text-2xl font-bold">{readingStats?.totalReaders || 0}</p>
                      <p className="text-xs text-muted-foreground">إجمالي القراء</p>
                    </div>
                    <div className="text-center p-4 bg-muted rounded-lg">
                      <p className="text-2xl font-bold">{readingStats?.completedReaders || 0}</p>
                      <p className="text-xs text-muted-foreground">أكملوا القراءة</p>
                    </div>
                    <div className="text-center p-4 bg-muted rounded-lg">
                      <p className="text-2xl font-bold">{readingStats?.avgProgress || 0}%</p>
                      <p className="text-xs text-muted-foreground">متوسط التقدم</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Star className="w-5 h-5" />
                    توزيع التقييمات
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {[5, 4, 3, 2, 1].map((rating) => {
                    const count = reviews?.filter((r: any) => r.rating === rating).length || 0;
                    const percentage = reviews?.length ? (count / reviews.length) * 100 : 0;
                    return (
                      <div key={rating} className="flex items-center gap-2 mb-2">
                        <span className="text-sm w-3">{rating}</span>
                        <Star className="w-4 h-4 fill-yellow-500 text-yellow-500" />
                        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-yellow-500 rounded-full transition-all"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                        <span className="text-sm text-muted-foreground w-8">{count}</span>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
};

export default AdminBookDetails;
