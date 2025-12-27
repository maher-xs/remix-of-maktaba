import { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { useAdminBooks, useAdminCategories } from '@/hooks/useAdmin';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  AdminDialog,
  AdminDialogContent,
  AdminDialogHeader,
  AdminDialogTitle,
  AdminDialogFooter,
  AdminDialogDescription,
} from '@/components/admin/AdminDialog';
import { AdminPagination } from '@/components/admin/AdminPagination';
import { Dialog, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Loader2, Search, Eye, Upload, UserCheck, Image, FileText, Copy, Star, MoreVertical, Download, BarChart3 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/hooks/useAuth';
import { useActivityLog } from '@/hooks/useActivityLog';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';

export const AdminBooks = () => {
  const { data: books, isLoading } = useAdminBooks();
  const { data: categories } = useAdminCategories();
  const { user } = useAuth();
  const { logActivity } = useActivityLog();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isTransferDialogOpen, setIsTransferDialogOpen] = useState(false);
  const [selectedBook, setSelectedBook] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [selectedNewOwner, setSelectedNewOwner] = useState('');
  const [selectedBooks, setSelectedBooks] = useState<string[]>([]);
  const [isDeletingBulk, setIsDeletingBulk] = useState(false);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Fetch all users for transfer ownership
  const { data: allUsers } = useQuery({
    queryKey: ['adminUsersForTransfer'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_admin_users');
      if (error) throw error;
      return data;
    },
  });

  const [formData, setFormData] = useState({
    title: '',
    author: '',
    description: '',
    category_id: '',
    cover_url: '',
    file_url: '',
    file_size: '',
    pages: '',
    publish_year: '',
    publisher: '',
    isbn: '',
    language: 'ar',
    is_featured: false,
    uploaded_by: '',
  });

  const resetForm = () => {
    setFormData({
      title: '',
      author: '',
      description: '',
      category_id: '',
      cover_url: '',
      file_url: '',
      file_size: '',
      pages: '',
      publish_year: '',
      publisher: '',
      isbn: '',
      language: 'ar',
      is_featured: false,
      uploaded_by: '',
    });
  };

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

      setFormData(prev => ({ ...prev, cover_url: publicUrl }));
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

      setFormData(prev => ({ 
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

  const handleAdd = async () => {
    if (!formData.title || !formData.author) {
      toast.error('يرجى ملء الحقول المطلوبة');
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('books').insert({
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
        uploaded_by: user?.id,
      });

      if (error) throw error;

      logActivity({
        actionType: 'create',
        entityType: 'book',
        entityName: formData.title,
      });

      toast.success('تم إضافة الكتاب بنجاح');
      queryClient.invalidateQueries({ queryKey: ['adminBooks'] });
      setIsAddDialogOpen(false);
      resetForm();
    } catch (error: any) {
      toast.error(error.message || 'حدث خطأ أثناء الإضافة');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = async () => {
    if (!selectedBook || !formData.title || !formData.author) {
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
          uploaded_by: formData.uploaded_by || selectedBook.uploaded_by,
        })
        .eq('id', selectedBook.id);

      if (error) throw error;

      logActivity({
        actionType: 'update',
        entityType: 'book',
        entityId: selectedBook.id,
        entityName: formData.title,
      });

      toast.success('تم تحديث الكتاب بنجاح');
      queryClient.invalidateQueries({ queryKey: ['adminBooks'] });
      setIsEditDialogOpen(false);
      setSelectedBook(null);
      resetForm();
    } catch (error: any) {
      toast.error(error.message || 'حدث خطأ أثناء التحديث');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTransferOwnership = async () => {
    if (!selectedBook || !selectedNewOwner) {
      toast.error('يرجى اختيار المالك الجديد');
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('books')
        .update({ uploaded_by: selectedNewOwner })
        .eq('id', selectedBook.id);

      if (error) throw error;

      const newOwner = allUsers?.find((u: any) => u.id === selectedNewOwner);
      logActivity({
        actionType: 'update',
        entityType: 'book',
        entityId: selectedBook.id,
        entityName: selectedBook.title,
        details: { action: 'transfer_ownership', new_owner: newOwner?.full_name || newOwner?.email }
      });

      toast.success('تم نقل الملكية بنجاح');
      queryClient.invalidateQueries({ queryKey: ['adminBooks'] });
      setIsTransferDialogOpen(false);
      setSelectedBook(null);
      setSelectedNewOwner('');
    } catch (error: any) {
      toast.error(error.message || 'حدث خطأ أثناء نقل الملكية');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (bookId: string, bookTitle: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا الكتاب؟')) return;

    try {
      const { error } = await supabase.from('books').delete().eq('id', bookId);
      if (error) throw error;

      logActivity({
        actionType: 'delete',
        entityType: 'book',
        entityId: bookId,
        entityName: bookTitle,
      });

      toast.success('تم حذف الكتاب بنجاح');
      queryClient.invalidateQueries({ queryKey: ['adminBooks'] });
    } catch (error: any) {
      toast.error(error.message || 'حدث خطأ أثناء الحذف');
    }
  };

  const openEditDialog = (book: any) => {
    setSelectedBook(book);
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
      uploaded_by: book.uploaded_by || '',
    });
    setIsEditDialogOpen(true);
  };

  const openTransferDialog = (book: any) => {
    setSelectedBook(book);
    setSelectedNewOwner('');
    setIsTransferDialogOpen(true);
  };

  // نسخ الكتاب
  const handleDuplicateBook = async (book: any) => {
    try {
      const { error } = await supabase.from('books').insert({
        title: `${book.title} (نسخة)`,
        author: book.author,
        description: book.description,
        category_id: book.category_id,
        cover_url: book.cover_url,
        file_url: book.file_url,
        file_size: book.file_size,
        pages: book.pages,
        publish_year: book.publish_year,
        publisher: book.publisher,
        isbn: book.isbn,
        language: book.language,
        is_featured: false,
        uploaded_by: user?.id,
      });

      if (error) throw error;

      logActivity({
        actionType: 'create',
        entityType: 'book',
        entityName: `${book.title} (نسخة)`,
        details: { action: 'duplicate', original_id: book.id }
      });

      toast.success('تم نسخ الكتاب بنجاح');
      queryClient.invalidateQueries({ queryKey: ['adminBooks'] });
    } catch (error: any) {
      toast.error(error.message || 'حدث خطأ أثناء نسخ الكتاب');
    }
  };

  // تبديل حالة المميز
  const handleToggleFeatured = async (book: any) => {
    try {
      const { error } = await supabase
        .from('books')
        .update({ is_featured: !book.is_featured })
        .eq('id', book.id);

      if (error) throw error;

      logActivity({
        actionType: 'update',
        entityType: 'book',
        entityId: book.id,
        entityName: book.title,
        details: { action: book.is_featured ? 'unfeature' : 'feature' }
      });

      toast.success(book.is_featured ? 'تم إزالة الكتاب من المميزة' : 'تم تمييز الكتاب');
      queryClient.invalidateQueries({ queryKey: ['adminBooks'] });
    } catch (error: any) {
      toast.error(error.message || 'حدث خطأ');
    }
  };

  // إعادة تعيين الإحصائيات
  const handleResetStats = async (book: any) => {
    if (!confirm('هل أنت متأكد من إعادة تعيين إحصائيات هذا الكتاب؟')) return;
    
    try {
      const { error } = await supabase
        .from('books')
        .update({ view_count: 0, download_count: 0 })
        .eq('id', book.id);

      if (error) throw error;

      logActivity({
        actionType: 'update',
        entityType: 'book',
        entityId: book.id,
        entityName: book.title,
        details: { action: 'reset_stats' }
      });

      toast.success('تم إعادة تعيين الإحصائيات');
      queryClient.invalidateQueries({ queryKey: ['adminBooks'] });
    } catch (error: any) {
      toast.error(error.message || 'حدث خطأ');
    }
  };

  const getOwnerName = (uploadedBy: string) => {
    const owner = allUsers?.find((u: any) => u.id === uploadedBy);
    return owner?.full_name || owner?.email || 'غير معروف';
  };

  const filteredBooks = books?.filter(book =>
    book.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    book.author.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Pagination logic
  const totalItems = filteredBooks?.length || 0;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const paginatedBooks = filteredBooks?.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Reset page when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  // تحديد/إلغاء تحديد كتاب
  const toggleBookSelection = (bookId: string) => {
    setSelectedBooks(prev => 
      prev.includes(bookId) 
        ? prev.filter(id => id !== bookId)
        : [...prev, bookId]
    );
  };

  // تحديد/إلغاء تحديد الكل
  const toggleSelectAll = () => {
    if (selectedBooks.length === filteredBooks?.length) {
      setSelectedBooks([]);
    } else {
      setSelectedBooks(filteredBooks?.map(book => book.id) || []);
    }
  };

  // حذف الكتب المحددة
  const handleBulkDelete = async () => {
    if (selectedBooks.length === 0) return;
    
    if (!confirm(`هل أنت متأكد من حذف ${selectedBooks.length} كتاب؟`)) return;

    setIsDeletingBulk(true);
    try {
      const { error } = await supabase
        .from('books')
        .delete()
        .in('id', selectedBooks);

      if (error) throw error;

      logActivity({
        actionType: 'delete',
        entityType: 'book',
        entityName: `حذف جماعي (${selectedBooks.length} كتاب)`,
        details: { deleted_count: selectedBooks.length, deleted_ids: selectedBooks }
      });

      toast.success(`تم حذف ${selectedBooks.length} كتاب بنجاح`);
      setSelectedBooks([]);
      queryClient.invalidateQueries({ queryKey: ['adminBooks'] });
    } catch (error: any) {
      toast.error(error.message || 'حدث خطأ أثناء الحذف');
    } finally {
      setIsDeletingBulk(false);
    }
  };

  const BookForm = ({ onSubmit, submitText, isEdit = false }: { onSubmit: () => void; submitText: string; isEdit?: boolean }) => (
    <div className="space-y-4 max-h-[70vh] overflow-y-auto px-1">
      {/* Cover Preview & Upload */}
      <div className="flex items-start gap-4 pb-4 border-b">
        <div className="relative">
          {formData.cover_url ? (
            <img
              src={formData.cover_url}
              alt="غلاف الكتاب"
              className="w-24 h-32 object-cover rounded-lg"
            />
          ) : (
            <div className="w-24 h-32 bg-muted rounded-lg flex items-center justify-center">
              <Image className="w-8 h-8 text-muted-foreground" />
            </div>
          )}
          <label className="absolute bottom-1 right-1 w-7 h-7 bg-primary rounded-full flex items-center justify-center cursor-pointer hover:bg-primary/90">
            {isUploadingCover ? (
              <Loader2 className="w-4 h-4 text-primary-foreground animate-spin" />
            ) : (
              <Upload className="w-3 h-3 text-primary-foreground" />
            )}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleCoverUpload}
              disabled={isUploadingCover}
            />
          </label>
        </div>
        <div className="flex-1 space-y-2">
          <Label>صورة الغلاف</Label>
          <Input
            value={formData.cover_url}
            onChange={(e) => setFormData({ ...formData, cover_url: e.target.value })}
            placeholder="رابط صورة الغلاف أو ارفع صورة"
            className="text-sm"
          />
        </div>
      </div>

      {/* File Upload */}
      <div className="space-y-2 pb-4 border-b">
        <Label>ملف الكتاب (PDF)</Label>
        <div className="flex items-center gap-2">
          <Input
            value={formData.file_url}
            onChange={(e) => setFormData({ ...formData, file_url: e.target.value })}
            placeholder="رابط ملف PDF"
            className="flex-1"
          />
          <label className="cursor-pointer">
            <Button type="button" variant="outline" className="gap-2" asChild>
              <span>
                {isUploadingFile ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <FileText className="w-4 h-4" />
                )}
                رفع ملف
              </span>
            </Button>
            <input
              type="file"
              accept=".pdf"
              className="hidden"
              onChange={handleFileUpload}
              disabled={isUploadingFile}
            />
          </label>
        </div>
        {formData.file_size && (
          <p className="text-xs text-muted-foreground">حجم الملف: {formData.file_size}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium">العنوان *</label>
          <Input
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder="عنوان الكتاب"
          />
        </div>
        <div>
          <label className="text-sm font-medium">المؤلف *</label>
          <Input
            value={formData.author}
            onChange={(e) => setFormData({ ...formData, author: e.target.value })}
            placeholder="اسم المؤلف"
          />
        </div>
      </div>

      <div>
        <label className="text-sm font-medium">الوصف</label>
        <Textarea
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="وصف الكتاب"
          rows={3}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium">التصنيف</label>
          <Select
            value={formData.category_id}
            onValueChange={(value) => setFormData({ ...formData, category_id: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="اختر التصنيف" />
            </SelectTrigger>
            <SelectContent>
              {categories?.map((cat) => (
                <SelectItem key={cat.id} value={cat.id}>
                  {cat.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-sm font-medium">اللغة</label>
          <Select
            value={formData.language}
            onValueChange={(value) => setFormData({ ...formData, language: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ar">العربية</SelectItem>
              <SelectItem value="en">الإنجليزية</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Owner Selection for Edit */}
      {isEdit && (
        <div>
          <label className="text-sm font-medium">المالك</label>
          <Select
            value={formData.uploaded_by}
            onValueChange={(value) => setFormData({ ...formData, uploaded_by: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="اختر المالك" />
            </SelectTrigger>
            <SelectContent>
              {allUsers?.map((u: any) => (
                <SelectItem key={u.id} value={u.id}>
                  {u.full_name || u.email} {u.username && `(@${u.username})`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="text-sm font-medium">عدد الصفحات</label>
          <Input
            type="number"
            value={formData.pages}
            onChange={(e) => setFormData({ ...formData, pages: e.target.value })}
            placeholder="عدد الصفحات"
          />
        </div>
        <div>
          <label className="text-sm font-medium">سنة النشر</label>
          <Input
            type="number"
            value={formData.publish_year}
            onChange={(e) => setFormData({ ...formData, publish_year: e.target.value })}
            placeholder="سنة النشر"
          />
        </div>
        <div>
          <label className="text-sm font-medium">الناشر</label>
          <Input
            value={formData.publisher}
            onChange={(e) => setFormData({ ...formData, publisher: e.target.value })}
            placeholder="الناشر"
          />
        </div>
      </div>

      <div className="flex items-center gap-6">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={formData.is_featured}
            onChange={(e) => setFormData({ ...formData, is_featured: e.target.checked })}
            className="rounded"
          />
          <span className="text-sm">مميز</span>
        </label>
      </div>

      <Button onClick={onSubmit} disabled={isSubmitting} className="w-full">
        {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : null}
        {submitText}
      </Button>
    </div>
  );

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">إدارة الكتب</h1>
            <p className="text-muted-foreground mt-1">إضافة وتعديل وحذف الكتب</p>
          </div>
          <Dialog>
            <DialogTrigger asChild>
              <Button onClick={() => { resetForm(); setIsAddDialogOpen(true); }}>
                <Plus className="w-4 h-4 ml-2" />
                إضافة كتاب
              </Button>
            </DialogTrigger>
          </Dialog>
          <AdminDialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <AdminDialogContent className="max-w-2xl">
              <AdminDialogHeader>
                <AdminDialogTitle>إضافة كتاب جديد</AdminDialogTitle>
              </AdminDialogHeader>
              <BookForm onSubmit={handleAdd} submitText="إضافة الكتاب" />
            </AdminDialogContent>
          </AdminDialog>
        </div>

        {/* شريط التحديد الجماعي */}
        {selectedBooks.length > 0 && (
          <Card className="border-destructive bg-destructive/5">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Badge variant="secondary" className="text-sm">
                  {selectedBooks.length} كتاب محدد
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedBooks([])}
                >
                  إلغاء التحديد
                </Button>
              </div>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleBulkDelete}
                disabled={isDeletingBulk}
                className="gap-2"
              >
                {isDeletingBulk ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
                حذف المحدد
              </Button>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <div className="flex items-center gap-4">
              <div className="relative flex-1">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="بحث في الكتب..."
                  className="pr-10"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <input
                        type="checkbox"
                        checked={selectedBooks.length === filteredBooks?.length && filteredBooks?.length > 0}
                        onChange={toggleSelectAll}
                        className="w-4 h-4 rounded border-muted-foreground"
                      />
                    </TableHead>
                    <TableHead>الغلاف</TableHead>
                    <TableHead>العنوان</TableHead>
                    <TableHead>المؤلف</TableHead>
                    <TableHead>التصنيف</TableHead>
                    <TableHead>المالك</TableHead>
                    <TableHead>الإجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedBooks?.map((book) => (
                    <TableRow key={book.id} className={selectedBooks.includes(book.id) ? 'bg-muted/50' : ''}>
                      <TableCell>
                        <input
                          type="checkbox"
                          checked={selectedBooks.includes(book.id)}
                          onChange={() => toggleBookSelection(book.id)}
                          className="w-4 h-4 rounded border-muted-foreground"
                        />
                      </TableCell>
                      <TableCell>
                        {book.cover_url ? (
                          <img
                            src={book.cover_url}
                            alt={book.title}
                            className="w-12 h-16 object-cover rounded"
                          />
                        ) : (
                          <div className="w-12 h-16 bg-muted rounded flex items-center justify-center">
                            <span className="text-xs text-muted-foreground">لا صورة</span>
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{book.title}</p>
                          <div className="flex items-center gap-2 mt-1">
                            {book.is_featured && (
                              <Badge variant="secondary" className="text-xs">مميز</Badge>
                            )}
                            <span className="text-xs text-muted-foreground">
                              {book.view_count} مشاهدة • {book.download_count} تحميل
                            </span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{book.author}</TableCell>
                      <TableCell>{(book.categories as any)?.name || '-'}</TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {book.uploaded_by ? getOwnerName(book.uploaded_by) : '-'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" asChild title="إدارة الكتاب">
                            <a href={`/admin/books/${book.id}`}>
                              <Pencil className="w-4 h-4" />
                            </a>
                          </Button>
                          <Button variant="ghost" size="icon" asChild title="عرض">
                            <a href={`/book/${book.id}`} target="_blank">
                              <Eye className="w-4 h-4" />
                            </a>
                          </Button>
                          
                          {/* قائمة الإجراءات المتقدمة */}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" title="المزيد">
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              <DropdownMenuItem onClick={() => handleDuplicateBook(book)}>
                                <Copy className="w-4 h-4 ml-2" />
                                نسخ الكتاب
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleToggleFeatured(book)}>
                                <Star className={`w-4 h-4 ml-2 ${book.is_featured ? 'fill-yellow-500 text-yellow-500' : ''}`} />
                                {book.is_featured ? 'إزالة من المميزة' : 'تمييز الكتاب'}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => openTransferDialog(book)}>
                                <UserCheck className="w-4 h-4 ml-2" />
                                نقل الملكية
                              </DropdownMenuItem>
                              {book.file_url && (
                                <DropdownMenuItem asChild>
                                  <a href={book.file_url} target="_blank" download>
                                    <Download className="w-4 h-4 ml-2" />
                                    تحميل الملف
                                  </a>
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => handleResetStats(book)}>
                                <BarChart3 className="w-4 h-4 ml-2" />
                                إعادة تعيين الإحصائيات
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => handleDelete(book.id, book.title)}
                                className="text-destructive focus:text-destructive"
                              >
                                <Trash2 className="w-4 h-4 ml-2" />
                                حذف الكتاب
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
            
            {/* Pagination */}
            <AdminPagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={totalItems}
              itemsPerPage={itemsPerPage}
              onPageChange={setCurrentPage}
              onItemsPerPageChange={(value) => {
                setItemsPerPage(value);
                setCurrentPage(1);
              }}
            />
          </CardContent>
        </Card>

        {/* Edit Dialog */}
        <AdminDialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <AdminDialogContent className="max-w-2xl">
            <AdminDialogHeader>
              <AdminDialogTitle>تعديل الكتاب</AdminDialogTitle>
            </AdminDialogHeader>
            <BookForm onSubmit={handleEdit} submitText="حفظ التغييرات" isEdit />
          </AdminDialogContent>
        </AdminDialog>

        {/* Transfer Ownership Dialog */}
        <AdminDialog open={isTransferDialogOpen} onOpenChange={setIsTransferDialogOpen}>
          <AdminDialogContent>
            <AdminDialogHeader>
              <AdminDialogTitle>نقل ملكية الكتاب</AdminDialogTitle>
              <AdminDialogDescription>
                نقل ملكية "{selectedBook?.title}" إلى مستخدم آخر
              </AdminDialogDescription>
            </AdminDialogHeader>
            <div className="space-y-4 py-4">
              <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                {selectedBook?.cover_url && (
                  <img src={selectedBook.cover_url} alt="" className="w-12 h-16 object-cover rounded" />
                )}
                <div>
                  <p className="font-medium">{selectedBook?.title}</p>
                  <p className="text-sm text-muted-foreground">
                    المالك الحالي: {selectedBook?.uploaded_by ? getOwnerName(selectedBook.uploaded_by) : 'غير معروف'}
                  </p>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>المالك الجديد</Label>
                <Select value={selectedNewOwner} onValueChange={setSelectedNewOwner}>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر المالك الجديد" />
                  </SelectTrigger>
                  <SelectContent>
                    {allUsers?.filter((u: any) => u.id !== selectedBook?.uploaded_by).map((u: any) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.full_name || u.email} {u.username && `(@${u.username})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <AdminDialogFooter>
              <Button variant="outline" onClick={() => setIsTransferDialogOpen(false)}>
                إلغاء
              </Button>
              <Button onClick={handleTransferOwnership} disabled={isSubmitting || !selectedNewOwner}>
                {isSubmitting && <Loader2 className="w-4 h-4 ml-2 animate-spin" />}
                نقل الملكية
              </Button>
            </AdminDialogFooter>
          </AdminDialogContent>
        </AdminDialog>
      </div>
    </AdminLayout>
  );
};

export default AdminBooks;
