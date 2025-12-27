import { useState, useMemo } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { BookOpen, MessageSquare, Sparkles, Search, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useCreateDiscussion } from '@/hooks/useDiscussions';
import { useBooks } from '@/hooks/useBooks';

const discussionSchema = z.object({
  title: z.string().min(5, 'العنوان يجب أن يكون 5 أحرف على الأقل').max(200, 'العنوان طويل جداً'),
  content: z.string().min(20, 'المحتوى يجب أن يكون 20 حرف على الأقل').max(5000, 'المحتوى طويل جداً'),
});

type DiscussionFormData = z.infer<typeof discussionSchema>;

interface CreateDiscussionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preselectedBookId?: string;
}

const CreateDiscussionDialog = ({ open, onOpenChange, preselectedBookId }: CreateDiscussionDialogProps) => {
  const createDiscussion = useCreateDiscussion();
  const { data: books, isLoading: booksLoading } = useBooks();
  const [isAboutBook, setIsAboutBook] = useState(!!preselectedBookId);
  const [selectedBookId, setSelectedBookId] = useState<string>(preselectedBookId || '');
  const [bookSearchQuery, setBookSearchQuery] = useState('');

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<DiscussionFormData>({
    resolver: zodResolver(discussionSchema),
  });

  const titleValue = watch('title', '');
  const contentValue = watch('content', '');

  // Filter books based on search query
  const filteredBooks = useMemo(() => {
    if (!books) return [];
    if (!bookSearchQuery.trim()) return books;
    
    const query = bookSearchQuery.toLowerCase();
    return books.filter(book => 
      book.title.toLowerCase().includes(query) ||
      book.author.toLowerCase().includes(query)
    );
  }, [books, bookSearchQuery]);

  const onSubmit = (data: DiscussionFormData) => {
    createDiscussion.mutate(
      {
        title: data.title,
        content: data.content,
        bookId: isAboutBook && selectedBookId ? selectedBookId : undefined,
      },
      {
        onSuccess: () => {
          reset();
          setIsAboutBook(false);
          setSelectedBookId('');
          setBookSearchQuery('');
          onOpenChange(false);
        },
      }
    );
  };

  const selectedBook = books?.find(b => b.id === selectedBookId);

  const handleClearSelection = () => {
    setSelectedBookId('');
    setBookSearchQuery('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader className="text-center pb-4">
          <div className="content-card-icon w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <Sparkles className="w-7 h-7" />
          </div>
          <DialogTitle className="text-xl">إنشاء مناقشة جديدة</DialogTitle>
          <DialogDescription>
            شارك أفكارك مع مجتمع القراء
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {/* Discussion Type Toggle */}
          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-xl border border-border/50">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${isAboutBook ? 'bg-primary/10' : 'bg-muted'}`}>
                <BookOpen className={`w-5 h-5 ${isAboutBook ? 'text-primary' : 'text-muted-foreground'}`} />
              </div>
              <div>
                <Label htmlFor="about-book" className="cursor-pointer font-medium">مناقشة حول كتاب</Label>
                <p className="text-xs text-muted-foreground">اربط مناقشتك بكتاب محدد</p>
              </div>
            </div>
            <Switch
              id="about-book"
              checked={isAboutBook}
              onCheckedChange={(checked) => {
                setIsAboutBook(checked);
                if (!checked) {
                  setSelectedBookId('');
                  setBookSearchQuery('');
                }
              }}
            />
          </div>

          {/* Book Selection with Search */}
          {isAboutBook && (
            <div className="space-y-3">
              <Label>اختر الكتاب</Label>
              
              {/* Selected Book Display */}
              {selectedBook ? (
                <div className="flex items-center justify-between p-3 bg-primary/5 rounded-xl border border-primary/20">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <BookOpen className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground line-clamp-1">{selectedBook.title}</p>
                      <p className="text-xs text-muted-foreground">{selectedBook.author}</p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={handleClearSelection}
                    className="h-8 w-8"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <>
                  {/* Search Input */}
                  <div className="relative">
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      type="text"
                      placeholder="ابحث عن كتاب بالعنوان أو اسم المؤلف..."
                      value={bookSearchQuery}
                      onChange={(e) => setBookSearchQuery(e.target.value)}
                      className="pr-10 h-11"
                    />
                  </div>

                  {/* Books List */}
                  <ScrollArea className="h-48 rounded-xl border border-border/50 bg-muted/30">
                    {booksLoading ? (
                      <div className="p-4 text-center text-muted-foreground">
                        <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                        جاري التحميل...
                      </div>
                    ) : filteredBooks.length > 0 ? (
                      <div className="p-2 space-y-1">
                        {filteredBooks.map((book) => (
                          <button
                            key={book.id}
                            type="button"
                            onClick={() => setSelectedBookId(book.id)}
                            className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted transition-colors text-right"
                          >
                            <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                              <BookOpen className="w-4 h-4 text-muted-foreground" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-foreground line-clamp-1">{book.title}</p>
                              <p className="text-xs text-muted-foreground line-clamp-1">{book.author}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="p-4 text-center text-muted-foreground text-sm">
                        {bookSearchQuery ? 'لا توجد نتائج لبحثك' : 'لا توجد كتب'}
                      </div>
                    )}
                  </ScrollArea>
                  
                  {/* Results Count */}
                  {books && books.length > 0 && (
                    <p className="text-xs text-muted-foreground text-center">
                      {bookSearchQuery 
                        ? `${filteredBooks.length} من ${books.length} كتاب`
                        : `${books.length} كتاب متاح`
                      }
                    </p>
                  )}
                </>
              )}
            </div>
          )}

          {/* Title */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="title">عنوان المناقشة</Label>
              <span className="text-xs text-muted-foreground">{titleValue.length}/200</span>
            </div>
            <Input
              id="title"
              placeholder="اكتب عنواناً جذاباً لمناقشتك..."
              className="h-12"
              {...register('title')}
            />
            {errors.title && (
              <p className="text-sm text-destructive">{errors.title.message}</p>
            )}
          </div>

          {/* Content */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="content">محتوى المناقشة</Label>
              <span className="text-xs text-muted-foreground">{contentValue.length}/5000</span>
            </div>
            <Textarea
              id="content"
              placeholder="اكتب تفاصيل المناقشة هنا... ما هي الأفكار التي تريد مشاركتها؟"
              rows={6}
              className="resize-none"
              {...register('content')}
            />
            {errors.content && (
              <p className="text-sm text-destructive">{errors.content.message}</p>
            )}
          </div>

          {/* Tips */}
          <div className="bg-muted/30 rounded-xl p-4 border border-border/30">
            <h4 className="text-sm font-medium text-foreground mb-2 flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-primary" />
              نصائح لمناقشة ناجحة
            </h4>
            <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
              <li>اختر عنواناً واضحاً ومحدداً</li>
              <li>اشرح فكرتك بوضوح واطرح أسئلة للنقاش</li>
              <li>كن محترماً في طرحك وتقبل الآراء المختلفة</li>
            </ul>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              إلغاء
            </Button>
            <Button 
              type="submit" 
              disabled={createDiscussion.isPending}
              className="gap-2 min-w-[120px]"
            >
              {createDiscussion.isPending ? (
                <>
                  <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  جاري النشر...
                </>
              ) : (
                <>
                  <MessageSquare className="w-4 h-4" />
                  نشر المناقشة
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateDiscussionDialog;
