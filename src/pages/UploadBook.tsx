import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Document, Page, pdfjs } from 'react-pdf';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { generateUUID } from '@/lib/utils';
import { useCategories } from '@/hooks/useCategories';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Upload, Loader2, BookOpen, FileText, User, Languages, X, Shield, AlertTriangle } from 'lucide-react';
import Layout from '@/components/layout/Layout';
import { validatePdfFile, validateImageFile, checkUploadRateLimit, sanitizeFileName } from '@/lib/fileSecurityUtils';
import { useContentModeration } from '@/hooks/useContentModeration';

// Set up PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

const MAX_TITLE_LENGTH = 150;
const MAX_AUTHOR_LENGTH = 80;
const MAX_DESCRIPTION_LENGTH = 1500;
const MAX_PUBLISHER_LENGTH = 100;
const MAX_CUSTOM_CATEGORY_LENGTH = 50;

// Generate years from current year back to 1800
const currentYear = new Date().getFullYear();
const years = Array.from({ length: currentYear - 1799 }, (_, i) => currentYear - i);

const uploadSchema = z.object({
  title: z.string().min(1, 'عنوان الكتاب مطلوب').max(MAX_TITLE_LENGTH, `العنوان يجب ألا يتجاوز ${MAX_TITLE_LENGTH} حرف`),
  authorType: z.enum(['account', 'custom']),
  author: z.string().max(MAX_AUTHOR_LENGTH, `اسم المؤلف يجب ألا يتجاوز ${MAX_AUTHOR_LENGTH} حرف`),
  description: z.string().max(MAX_DESCRIPTION_LENGTH, `الوصف يجب ألا يتجاوز ${MAX_DESCRIPTION_LENGTH} حرف`).optional().or(z.literal('')),
  category_id: z.string().optional().or(z.literal('')),
  custom_category: z.string().max(MAX_CUSTOM_CATEGORY_LENGTH, `التصنيف يجب ألا يتجاوز ${MAX_CUSTOM_CATEGORY_LENGTH} حرف`).optional().or(z.literal('')),
  publish_year: z.string().optional().or(z.literal('')),
  publisher: z.string().max(MAX_PUBLISHER_LENGTH, `اسم الناشر يجب ألا يتجاوز ${MAX_PUBLISHER_LENGTH} حرف`).optional().or(z.literal('')),
  pages: z.string().optional().or(z.literal('')),
  language: z.string().default('ar'),
}).refine((data) => {
  if (data.authorType === 'custom' && !data.author.trim()) {
    return false;
  }
  return true;
}, {
  message: 'اسم المؤلف مطلوب',
  path: ['author'],
}).refine((data) => {
  // Either a category is selected OR custom category is provided
  if (!data.category_id && !data.custom_category?.trim()) {
    return false;
  }
  return true;
}, {
  message: 'يرجى اختيار التصنيف أو كتابة تصنيف مخصص',
  path: ['category_id'],
});

type UploadFormData = z.infer<typeof uploadSchema>;

const UploadBook = () => {
  const { user, loading: authLoading, profile } = useAuth();
  const navigate = useNavigate();
  const { data: categories } = useCategories();
  const { moderateBook, validateImageWithToast, isChecking: isModerating } = useContentModeration();
  const [bookFile, setBookFile] = useState<File | null>(null);
  const [bookFileUrl, setBookFileUrl] = useState<string | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [autoCoverPreview, setAutoCoverPreview] = useState<string | null>(null);
  const [autoCoverBlob, setAutoCoverBlob] = useState<Blob | null>(null);
  const [uploading, setUploading] = useState(false);
  const [showCustomCategory, setShowCustomCategory] = useState(false);
  const [extractingMetadata, setExtractingMetadata] = useState(false);
  const [extractingCover, setExtractingCover] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const form = useForm<UploadFormData>({
    resolver: zodResolver(uploadSchema),
    defaultValues: {
      title: '',
      authorType: 'account',
      author: '',
      description: '',
      category_id: '',
      custom_category: '',
      publish_year: '',
      publisher: '',
      pages: '',
      language: 'ar',
    },
  });

  const authorType = form.watch('authorType');

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  const extractPdfMetadata = async (file: File) => {
    setExtractingMetadata(true);
    try {
      // Convert file to base64 for edge function
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          const base64 = (reader.result as string).split(',')[1];
          resolve(base64);
        };
        reader.onerror = reject;
      });
      reader.readAsDataURL(file);
      const base64Data = await base64Promise;

      const { data: result, error } = await supabase.functions.invoke('extract-pdf-metadata', {
        body: { 
          file: base64Data,
          filename: file.name 
        }
      });

      if (error) throw error;
      
      if (result.success && result.metadata) {
        const { title, author, year, pages, publisher } = result.metadata;
        
        // Auto-fill form fields if metadata found
        if (title) {
          form.setValue('title', title);
          toast.success('تم استخراج العنوان من الكتاب');
        }
        if (author) {
          form.setValue('authorType', 'custom');
          form.setValue('author', author);
        }
        if (year) {
          form.setValue('publish_year', year);
        }
        if (pages && pages > 0) {
          form.setValue('pages', pages.toString());
        }
        if (publisher) {
          form.setValue('publisher', publisher);
        }
        
        if (title || author || year) {
          toast.success('تم استخراج البيانات من الكتاب تلقائياً');
        }
      }
    } catch (error) {
      console.error('Error extracting metadata:', error);
      // Silent fail - user can still fill manually
    } finally {
      setExtractingMetadata(false);
    }
  };

  const handleCoverChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // 🔐 Secure validation using magic bytes
      const validation = await validateImageFile(file);
      if (!validation.isValid) {
        toast.error(validation.error || 'صورة غير صالحة');
        return;
      }
      
      // 🔐 AI-based image moderation for NSFW content
      toast.loading('جاري فحص محتوى الصورة...', { id: 'image-moderation' });
      const isImageSafe = await validateImageWithToast(file, 'صورة الغلاف');
      toast.dismiss('image-moderation');
      
      if (!isImageSafe) {
        return;
      }
      
      setCoverFile(file);
      setCoverPreview(URL.createObjectURL(file));
      toast.success('تم التحقق من صحة الصورة ✓');
    }
  };

  const clearManualCover = () => {
    setCoverFile(null);
    if (coverPreview) {
      URL.revokeObjectURL(coverPreview);
    }
    setCoverPreview(null);
  };

  // Extract first page as cover image
  const extractCoverFromPdf = async (pdfDocument: any) => {
    try {
      setExtractingCover(true);
      const page = await pdfDocument.getPage(1);
      const scale = 2; // Higher scale for better quality
      const viewport = page.getViewport({ scale });
      
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      
      canvas.height = viewport.height;
      canvas.width = viewport.width;
      
      await page.render({
        canvasContext: context,
        viewport: viewport,
      }).promise;
      
      // Convert canvas to blob
      const blob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((b) => resolve(b!), 'image/jpeg', 0.85);
      });
      
      const previewUrl = URL.createObjectURL(blob);
      setAutoCoverPreview(previewUrl);
      setAutoCoverBlob(blob);
      
      toast.success('تم استخراج صورة الغلاف من الصفحة الأولى');
    } catch (error) {
      console.error('Error extracting cover from PDF:', error);
    } finally {
      setExtractingCover(false);
    }
  };

  const handleBookFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // 🔐 Check rate limit first
      if (user) {
        const rateLimit = checkUploadRateLimit(user.id, 10, 3600000);
        if (!rateLimit.allowed) {
          const minutesLeft = Math.ceil(rateLimit.resetIn / 60000);
          toast.error(`تم تجاوز الحد الأقصى للرفع. حاول مرة أخرى بعد ${minutesLeft} دقيقة`);
          return;
        }
      }

      // 🔐 Secure validation using magic bytes
      toast.loading('جاري التحقق من صحة الملف...', { id: 'file-validation' });
      const validation = await validatePdfFile(file);
      
      if (!validation.isValid) {
        toast.error(validation.error || 'ملف غير صالح', { id: 'file-validation' });
        return;
      }
      
      toast.success('تم التحقق من صحة ملف PDF ✓', { id: 'file-validation' });
      setBookFile(file);
      
      // Create URL for PDF loading
      const fileUrl = URL.createObjectURL(file);
      setBookFileUrl(fileUrl);
      
      // Load PDF and extract first page as cover
      try {
        const loadingTask = pdfjs.getDocument(fileUrl);
        const pdfDocument = await loadingTask.promise;
        await extractCoverFromPdf(pdfDocument);
      } catch (error) {
        console.error('Error loading PDF for cover extraction:', error);
      }
      
      // Extract metadata from PDF
      await extractPdfMetadata(file);
    }
  };
  // Helper function to generate slug from Arabic text
  const generateSlug = (text: string): string => {
    return text
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^\u0621-\u064Aa-z0-9-]/g, '')
      .substring(0, 50);
  };

  const onSubmit = async (values: UploadFormData) => {
    if (!user) return;

    if (!bookFile) {
      toast.error('يرجى رفع ملف الكتاب');
      return;
    }

    // 🔐 Content moderation - check for profanity in ALL text fields
    const contentCheck = moderateBook({
      title: values.title,
      description: values.description,
      author: values.authorType === 'custom' ? values.author : undefined,
      publisher: values.publisher,
    });

    if (!contentCheck.isClean) {
      toast.error('يحتوي المحتوى على كلمات غير لائقة', {
        description: contentCheck.message,
        icon: <AlertTriangle className="w-5 h-5 text-destructive" />
      });
      return;
    }

    // Check custom category for profanity
    if (values.custom_category?.trim()) {
      const categoryCheck = moderateBook({ title: values.custom_category });
      if (!categoryCheck.isClean) {
        toast.error('اسم التصنيف يحتوي على كلمات غير لائقة');
        return;
      }
    }

    setUploading(true);
    try {
      const bookId = generateUUID();
      let coverUrl = null;
      let fileUrl = null;
      let fileSize = null;
      let finalCategoryId = values.category_id || null;

      // If custom category is provided, create it first
      if (values.custom_category?.trim() && !values.category_id) {
        const customCategoryName = values.custom_category.trim();
        const slug = generateSlug(customCategoryName) || `custom-${Date.now()}`;
        
        // Check if category with same name already exists
        const { data: existingCategory } = await supabase
          .from('categories')
          .select('id')
          .eq('name', customCategoryName)
          .maybeSingle();

        if (existingCategory) {
          // Use existing category
          finalCategoryId = existingCategory.id;
        } else {
          // Create new category
          const { data: newCategory, error: categoryError } = await supabase
            .from('categories')
            .insert({
              name: customCategoryName,
              slug: slug,
              description: `تصنيف مخصص: ${customCategoryName}`,
              icon: 'folder',
              color: 'bg-gray-500',
            })
            .select('id')
            .single();

          if (categoryError) {
            console.error('Error creating category:', categoryError);
            toast.error('حدث خطأ في إنشاء التصنيف المخصص');
          } else if (newCategory) {
            finalCategoryId = newCategory.id;
            toast.success(`تم إنشاء تصنيف جديد: ${customCategoryName}`);
          }
        }
      }

      // Upload cover - use manual cover, or auto-extracted cover from PDF
      const coverToUpload = coverFile || (autoCoverBlob ? new File([autoCoverBlob], 'cover.jpg', { type: 'image/jpeg' }) : null);
      
      if (coverToUpload) {
        const coverExt = coverFile ? coverFile.name.split('.').pop() : 'jpg';
        const coverPath = `${bookId}/cover.${coverExt}`;
        
        const { error: coverError } = await supabase.storage
          .from('maktaba')
          .upload(coverPath, coverToUpload);

        if (coverError) throw coverError;

        const { data: { publicUrl } } = supabase.storage
          .from('maktaba')
          .getPublicUrl(coverPath);
        
        coverUrl = publicUrl;
      }

      // Upload book file
      const bookPath = `${bookId}/book.pdf`;
      const { error: bookError } = await supabase.storage
        .from('maktaba')
        .upload(bookPath, bookFile);

      if (bookError) throw bookError;

      const { data: { publicUrl: bookPublicUrl } } = supabase.storage
        .from('maktaba')
        .getPublicUrl(bookPath);
      
      fileUrl = bookPublicUrl;
      fileSize = `${(bookFile.size / (1024 * 1024)).toFixed(1)} MB`;

      // Determine author name based on selection
      const authorName = values.authorType === 'account' 
        ? (profile?.full_name || profile?.username || 'مستخدم مجهول')
        : values.author;

      // Insert book record
      const { error: insertError } = await supabase
        .from('books')
        .insert({
          id: bookId,
          title: values.title.trim(),
          author: authorName,
          description: values.description?.trim() || null,
          category_id: finalCategoryId,
          publish_year: values.publish_year ? parseInt(values.publish_year) : null,
          publisher: values.publisher?.trim() || null,
          pages: values.pages ? parseInt(values.pages) : null,
          language: values.language,
          cover_url: coverUrl,
          file_url: fileUrl,
          file_size: fileSize,
          uploaded_by: user.id,
        });

      if (insertError) throw insertError;

      toast.success('تم رفع الكتاب بنجاح!');
      navigate(`/book/${bookId}`);
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error('حدث خطأ أثناء رفع الكتاب');
    } finally {
      setUploading(false);
    }
  };

  if (authLoading) {
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
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        {/* Header Section */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-br from-primary to-primary/80 shadow-lg mb-6">
            <Upload className="w-10 h-10 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold mb-2">رفع كتاب جديد</h1>
          <p className="text-muted-foreground text-lg">شارك المعرفة مع مجتمع القراء العرب</p>
        </div>

        <Card className="border-0 shadow-xl bg-card/80 backdrop-blur-sm">
          <CardContent className="p-6 md:p-8">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                
                {/* Upload Section - Two columns on desktop */}
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Book File Upload */}
                  <div className="space-y-3">
                    <label className="text-sm font-semibold flex items-center gap-2">
                      <FileText className="w-4 h-4 text-primary" />
                      ملف الكتاب (PDF) <span className="text-destructive">*</span>
                    </label>
                    <div className={`relative border-2 border-dashed rounded-2xl p-8 text-center transition-all duration-300 cursor-pointer group
                      ${bookFile 
                        ? 'border-primary bg-primary/5' 
                        : 'border-border hover:border-primary/50 hover:bg-accent/50'}`}
                    >
                      <input
                        type="file"
                        accept=".pdf"
                        onChange={handleBookFileChange}
                        className="hidden"
                        id="book-file"
                      />
                      <label htmlFor="book-file" className="cursor-pointer block">
                        {extractingMetadata ? (
                          <div className="flex flex-col items-center justify-center gap-3 py-4">
                            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                              <Loader2 className="w-8 h-8 animate-spin text-primary" />
                            </div>
                            <span className="text-primary font-medium">جاري استخراج البيانات...</span>
                          </div>
                        ) : bookFile ? (
                          <div className="flex flex-col items-center justify-center gap-3 py-4">
                            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                              <FileText className="w-8 h-8 text-primary" />
                            </div>
                            <div className="space-y-1">
                              <p className="font-medium text-foreground truncate max-w-[200px]">{bookFile.name}</p>
                              <p className="text-xs text-muted-foreground">{(bookFile.size / (1024 * 1024)).toFixed(1)} MB</p>
                              <span className="inline-flex items-center gap-1 text-xs text-primary bg-primary/10 px-2 py-1 rounded-full">
                                ✓ تم الرفع
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center gap-3 py-4 text-muted-foreground group-hover:text-foreground transition-colors">
                            <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                              <Upload className="w-8 h-8 group-hover:text-primary transition-colors" />
                            </div>
                            <div className="space-y-1">
                              <p className="font-medium">اضغط لاختيار ملف PDF</p>
                              <p className="text-xs">الحد الأقصى 50 ميجابايت</p>
                            </div>
                          </div>
                        )}
                      </label>
                    </div>
                  </div>

                  {/* Cover Image Upload */}
                  <div className="space-y-3">
                    <label className="text-sm font-semibold flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-primary" />
                      صورة الغلاف <span className="text-muted-foreground text-xs font-normal">(اختياري)</span>
                    </label>
                    <div className={`relative border-2 border-dashed rounded-2xl p-8 text-center transition-all duration-300 cursor-pointer group
                      ${coverPreview || autoCoverPreview 
                        ? 'border-primary bg-primary/5' 
                        : 'border-border hover:border-primary/50 hover:bg-accent/50'}`}
                    >
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleCoverChange}
                        className="hidden"
                        id="cover-file"
                      />
                      <label htmlFor="cover-file" className="cursor-pointer block">
                        {coverPreview ? (
                          <div className="relative inline-block">
                            <img 
                              src={coverPreview} 
                              alt="غلاف الكتاب" 
                              className="w-28 h-40 object-cover mx-auto rounded-xl shadow-lg"
                            />
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                clearManualCover();
                              }}
                              className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1.5 hover:bg-destructive/80 shadow-md transition-transform hover:scale-110"
                            >
                              <X className="w-3 h-3" />
                            </button>
                            <p className="text-xs text-primary mt-3 font-medium">غلاف مخصص</p>
                          </div>
                        ) : extractingCover ? (
                          <div className="flex flex-col items-center justify-center gap-3 py-4">
                            <Loader2 className="w-8 h-8 animate-spin text-primary" />
                            <span className="text-primary font-medium">جاري استخراج الغلاف...</span>
                          </div>
                        ) : autoCoverPreview ? (
                          <div className="relative inline-block">
                            <img 
                              src={autoCoverPreview} 
                              alt="غلاف تلقائي" 
                              className="w-28 h-40 object-cover mx-auto rounded-xl shadow-lg ring-2 ring-primary/30"
                            />
                            <span className="absolute -top-2 -right-2 bg-primary text-primary-foreground text-[10px] px-2 py-0.5 rounded-full font-medium">
                              تلقائي
                            </span>
                            <p className="text-xs text-muted-foreground mt-3">اضغط لتغيير الغلاف</p>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center gap-3 py-4 text-muted-foreground group-hover:text-foreground transition-colors">
                            <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                              <BookOpen className="w-8 h-8 group-hover:text-primary transition-colors" />
                            </div>
                            <div className="space-y-1">
                              <p className="font-medium">اضغط لاختيار صورة</p>
                              <p className="text-xs">أو سيُستخدم الغلاف التلقائي</p>
                            </div>
                          </div>
                        )}
                      </label>
                    </div>
                  </div>
                </div>

                {/* Divider */}
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-border"></div>
                  </div>
                  <div className="relative flex justify-center">
                    <span className="bg-card px-4 text-sm text-muted-foreground">معلومات الكتاب</span>
                  </div>
                </div>

                {/* Title */}
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-semibold">
                        عنوان الكتاب <span className="text-destructive">*</span>
                      </FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input 
                            placeholder="أدخل عنوان الكتاب" 
                            maxLength={MAX_TITLE_LENGTH}
                            className="h-12 text-base"
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

                {/* Author Selection */}
                <div className="grid md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="authorType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-semibold">
                          المؤلف <span className="text-destructive">*</span>
                        </FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="h-12">
                              <SelectValue placeholder="اختر المؤلف" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="account">
                              حسابي ({profile?.full_name || profile?.username || 'لم يتم تعيين الاسم'})
                            </SelectItem>
                            <SelectItem value="custom">كتابة اسم مخصص</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {authorType === 'custom' && (
                    <FormField
                      control={form.control}
                      name="author"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-semibold">
                            اسم المؤلف <span className="text-destructive">*</span>
                          </FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input 
                                placeholder="اسم المؤلف" 
                                maxLength={MAX_AUTHOR_LENGTH}
                                className="h-12"
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
                  )}
                </div>

                {/* Category */}
                <FormField
                  control={form.control}
                  name="category_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-semibold">
                        التصنيف <span className="text-destructive">*</span>
                      </FormLabel>
                      <Select 
                        onValueChange={(value) => {
                          if (value === 'custom') {
                            setShowCustomCategory(true);
                            field.onChange('');
                          } else {
                            setShowCustomCategory(false);
                            field.onChange(value);
                          }
                        }} 
                        value={showCustomCategory ? 'custom' : field.value}
                      >
                        <FormControl>
                          <SelectTrigger className="h-12">
                            <SelectValue placeholder="اختر التصنيف" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {categories?.map((category) => (
                            <SelectItem key={category.id} value={category.id}>
                              {category.name}
                            </SelectItem>
                          ))}
                          <SelectItem value="custom">
                            أخرى (كتابة تصنيف مخصص)
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {showCustomCategory && (
                  <FormField
                    control={form.control}
                    name="custom_category"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <div className="relative">
                            <Input 
                              placeholder="اكتب التصنيف المخصص" 
                              maxLength={MAX_CUSTOM_CATEGORY_LENGTH}
                              className="h-12"
                              {...field} 
                            />
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                              {field.value?.length || 0}/{MAX_CUSTOM_CATEGORY_LENGTH}
                            </span>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {/* Description */}
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-semibold">وصف الكتاب</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Textarea 
                            placeholder="نبذة مختصرة عن محتوى الكتاب..." 
                            className="resize-none min-h-[120px]"
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

                {/* Additional Info Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {/* Publish Year */}
                  <FormField
                    control={form.control}
                    name="publish_year"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-semibold">سنة النشر</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="h-12">
                              <SelectValue placeholder="السنة" />
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
                        <FormLabel className="text-sm font-semibold">الصفحات</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="200" className="h-12" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Publisher */}
                  <FormField
                    control={form.control}
                    name="publisher"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-semibold">دار النشر</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="الناشر" 
                            maxLength={MAX_PUBLISHER_LENGTH}
                            className="h-12"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Language */}
                  <FormField
                    control={form.control}
                    name="language"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-semibold">اللغة</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="h-12">
                              <SelectValue placeholder="اللغة" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="ar">العربية</SelectItem>
                            <SelectItem value="en">الإنجليزية</SelectItem>
                            <SelectItem value="fr">الفرنسية</SelectItem>
                            <SelectItem value="de">الألمانية</SelectItem>
                            <SelectItem value="es">الإسبانية</SelectItem>
                            <SelectItem value="tr">التركية</SelectItem>
                            <SelectItem value="fa">الفارسية</SelectItem>
                            <SelectItem value="ur">الأردية</SelectItem>
                            <SelectItem value="other">أخرى</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Submit Button */}
                <div className="pt-4">
                  <Button
                    type="submit"
                    disabled={uploading}
                    className="w-full h-14 text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
                  >
                    {uploading ? (
                      <>
                        <Loader2 className="ml-2 h-6 w-6 animate-spin" />
                        جاري رفع الكتاب...
                      </>
                    ) : (
                      <>
                        <Upload className="ml-2 h-6 w-6" />
                        رفع الكتاب
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default UploadBook;
