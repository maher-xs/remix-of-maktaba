import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useCategories } from '@/hooks/useCategories';
import { useContentModeration } from '@/hooks/useContentModeration';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Save, Loader2, Trash2, ArrowRight, AlertTriangle } from 'lucide-react';
import Layout from '@/components/layout/Layout';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const MAX_TITLE_LENGTH = 150;
const MAX_AUTHOR_LENGTH = 80;
const MAX_DESCRIPTION_LENGTH = 1500;
const MAX_PUBLISHER_LENGTH = 100;

const currentYear = new Date().getFullYear();
const years = Array.from({ length: currentYear - 1799 }, (_, i) => currentYear - i);

const editSchema = z.object({
  title: z.string().min(1, 'عنوان الكتاب مطلوب').max(MAX_TITLE_LENGTH),
  author: z.string().min(1, 'اسم المؤلف مطلوب').max(MAX_AUTHOR_LENGTH),
  description: z.string().max(MAX_DESCRIPTION_LENGTH).optional().or(z.literal('')),
  category_id: z.string().optional().or(z.literal('')),
  publish_year: z.string().optional().or(z.literal('')),
  publisher: z.string().max(MAX_PUBLISHER_LENGTH).optional().or(z.literal('')),
  pages: z.string().optional().or(z.literal('')),
});

type EditFormData = z.infer<typeof editSchema>;

const EditBook = () => {
  const { id } = useParams<{ id: string }>();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { data: categories } = useCategories();
  const { moderateBook } = useContentModeration();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const form = useForm<EditFormData>({
    resolver: zodResolver(editSchema),
    defaultValues: {
      title: '',
      author: '',
      description: '',
      category_id: '',
      publish_year: '',
      publisher: '',
      pages: '',
    },
  });

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
      return;
    }

    const fetchBook = async () => {
      if (!id || !user) return;

      const { data, error } = await supabase
        .from('books')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error || !data) {
        toast.error('لم يتم العثور على الكتاب');
        navigate('/my-library');
        return;
      }

      // Check if user owns this book
      if (data.uploaded_by !== user.id) {
        toast.error('ليس لديك صلاحية تعديل هذا الكتاب');
        navigate('/my-library');
        return;
      }

      form.reset({
        title: data.title,
        author: data.author,
        description: data.description || '',
        category_id: data.category_id || '',
        publish_year: data.publish_year?.toString() || '',
        publisher: data.publisher || '',
        pages: data.pages?.toString() || '',
      });

      setLoading(false);
    };

    if (user) {
      fetchBook();
    }
  }, [id, user, authLoading, navigate, form]);

  const onSubmit = async (values: EditFormData) => {
    if (!user || !id) return;

    // 🔐 Content moderation - check all text fields for profanity
    const contentCheck = moderateBook({
      title: values.title,
      description: values.description,
      author: values.author,
      publisher: values.publisher,
    });

    if (!contentCheck.isClean) {
      toast.error('يحتوي المحتوى على كلمات غير لائقة', {
        description: contentCheck.message,
        icon: <AlertTriangle className="w-5 h-5 text-destructive" />
      });
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('books')
        .update({
          title: values.title.trim(),
          author: values.author.trim(),
          description: values.description?.trim() || null,
          category_id: values.category_id || null,
          publish_year: values.publish_year ? parseInt(values.publish_year) : null,
          publisher: values.publisher?.trim() || null,
          pages: values.pages ? parseInt(values.pages) : null,
        })
        .eq('id', id)
        .eq('uploaded_by', user.id);

      if (error) throw error;

      toast.success('تم تحديث الكتاب بنجاح');
      navigate(`/book/${id}`);
    } catch (error: any) {
      console.error('Update error:', error);
      toast.error('حدث خطأ أثناء تحديث الكتاب');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!user || !id) return;

    setDeleting(true);
    try {
      // Delete book files from storage
      const { data: files } = await supabase.storage
        .from('maktaba')
        .list(id);

      if (files && files.length > 0) {
        await supabase.storage
          .from('maktaba')
          .remove(files.map(f => `${id}/${f.name}`));
      }

      // Delete book record
      const { error } = await supabase
        .from('books')
        .delete()
        .eq('id', id)
        .eq('uploaded_by', user.id);

      if (error) throw error;

      toast.success('تم حذف الكتاب بنجاح');
      navigate('/my-library');
    } catch (error: any) {
      console.error('Delete error:', error);
      toast.error('حدث خطأ أثناء حذف الكتاب');
    } finally {
      setDeleting(false);
    }
  };

  if (authLoading || loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        {/* Back Button */}
        <Button 
          variant="ghost" 
          className="mb-4 gap-2"
          onClick={() => navigate(-1)}
        >
          <ArrowRight className="w-4 h-4" />
          رجوع
        </Button>

        <Card className="border-primary/20">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold">تعديل الكتاب</CardTitle>
            <CardDescription>قم بتحديث معلومات الكتاب</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>عنوان الكتاب *</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input 
                            placeholder="أدخل عنوان الكتاب" 
                            maxLength={MAX_TITLE_LENGTH}
                            {...field} 
                          />
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                            {field.value?.length || 0}/{MAX_TITLE_LENGTH}
                          </span>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Author */}
                <FormField
                  control={form.control}
                  name="author"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>المؤلف *</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input 
                            placeholder="اسم المؤلف" 
                            maxLength={MAX_AUTHOR_LENGTH}
                            {...field} 
                          />
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                            {field.value?.length || 0}/{MAX_AUTHOR_LENGTH}
                          </span>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Category */}
                <FormField
                  control={form.control}
                  name="category_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>التصنيف</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="اختر التصنيف" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {categories?.map((category) => (
                            <SelectItem key={category.id} value={category.id}>
                              {category.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Description */}
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>وصف الكتاب</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Textarea 
                            placeholder="نبذة عن الكتاب..." 
                            className="resize-none"
                            rows={4}
                            maxLength={MAX_DESCRIPTION_LENGTH}
                            {...field} 
                          />
                          <span className="absolute left-3 bottom-3 text-xs text-muted-foreground">
                            {field.value?.length || 0}/{MAX_DESCRIPTION_LENGTH}
                          </span>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  {/* Publish Year */}
                  <FormField
                    control={form.control}
                    name="publish_year"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>سنة النشر</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="اختر السنة" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="max-h-[200px]">
                            {years.map((year) => (
                              <SelectItem key={year} value={year.toString()}>
                                {year}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Pages */}
                  <FormField
                    control={form.control}
                    name="pages"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>عدد الصفحات</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="200" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Publisher */}
                <FormField
                  control={form.control}
                  name="publisher"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>دار النشر</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input 
                            placeholder="اسم دار النشر" 
                            maxLength={MAX_PUBLISHER_LENGTH}
                            {...field} 
                          />
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                            {field.value?.length || 0}/{MAX_PUBLISHER_LENGTH}
                          </span>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Action Buttons */}
                <div className="flex flex-col gap-3 pt-4">
                  <Button
                    type="submit"
                    disabled={saving}
                    className="w-full h-12"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="ml-2 h-5 w-5 animate-spin" />
                        جاري الحفظ...
                      </>
                    ) : (
                      <>
                        <Save className="ml-2 h-5 w-5" />
                        حفظ التغييرات
                      </>
                    )}
                  </Button>

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        type="button"
                        variant="destructive"
                        disabled={deleting}
                        className="w-full h-12"
                      >
                        <Trash2 className="ml-2 h-5 w-5" />
                        حذف الكتاب
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>هل أنت متأكد؟</AlertDialogTitle>
                        <AlertDialogDescription>
                          سيتم حذف الكتاب نهائياً ولا يمكن التراجع عن هذا الإجراء.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter className="gap-2">
                        <AlertDialogCancel>إلغاء</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={handleDelete}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          {deleting ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            'نعم، احذف الكتاب'
                          )}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default EditBook;
