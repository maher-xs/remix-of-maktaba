import { useState, useCallback, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, BookOpen, Trash2, Edit2, Globe, Lock, MoreVertical, ChevronLeft, X, GripVertical, Share2, Copy, Check, ImagePlus, Loader2, Users, List, UserMinus } from 'lucide-react';
import Layout from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useReadingLists, useReadingListBooks, ReadingListBook, useFollowedReadingLists, FollowedReadingList } from '@/hooks/useReadingLists';
import { useAuth } from '@/hooks/useAuth';
import { useSEO } from '@/hooks/useSEO';
import { Navigate } from 'react-router-dom';
import { useIsMobile } from '@/hooks/use-mobile';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

const ReadingListCard = ({ list, onEdit, onDelete, onOpen }: { 
  list: any; 
  onEdit: (list: any) => void;
  onDelete: (id: string) => void;
  onOpen: (list: any) => void;
}) => {
  const { data: books } = useReadingListBooks(list.id);
  const isMobile = useIsMobile();

  return (
    <Card 
      className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer group active:scale-[0.98]"
      onClick={() => onOpen(list)}
    >
      <CardContent className="p-0">
        {/* Cover - Custom or Book Grid */}
        <div className="h-36 sm:h-44 bg-muted relative overflow-hidden flex items-center justify-center">
          {list.cover_url ? (
            // Custom cover image
            <img
              src={list.cover_url}
              alt={list.name}
              loading="lazy"
              decoding="async"
              className="w-full h-full object-contain"
            />
          ) : books && books.length > 0 ? (
            // Book covers grid - horizontal layout
            <div className="w-full h-full grid grid-cols-4 gap-0.5 p-1">
              {books.slice(0, 4).map((item) => (
                <div key={item.id} className="bg-background overflow-hidden rounded-sm">
                  {item.book?.cover_url ? (
                    <img
                      src={item.book.cover_url}
                      alt={item.book.title}
                      loading="lazy"
                      decoding="async"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-muted">
                      <BookOpen className="w-4 h-4 text-muted-foreground" />
                    </div>
                  )}
                </div>
              ))}
              {[...Array(Math.max(0, 4 - (books?.length || 0)))].map((_, i) => (
                <div key={`empty-${i}`} className="bg-muted/50 rounded-sm" />
              ))}
            </div>
          ) : (
            // Empty state
            <div className="w-full h-full flex items-end justify-start bg-gradient-to-br from-primary/5 to-primary/10">
              <div className="m-3 inline-flex items-center gap-2 rounded-full bg-background/90 px-3 py-1.5 text-xs text-muted-foreground shadow-sm border border-muted-foreground/10">
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                  <BookOpen className="w-3.5 h-3.5 text-primary/60" />
                </div>
                <span>قائمة فارغة</span>
              </div>
            </div>
          )}
          {/* Overlay on hover/tap */}
          <div className={`absolute inset-0 bg-primary/10 transition-opacity flex items-center justify-center ${isMobile ? 'opacity-0 active:opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
            <span className="bg-background/90 text-foreground px-3 py-1.5 rounded-full text-xs sm:text-sm font-medium">
              عرض الكتب
            </span>
          </div>
        </div>

        {/* Info */}
        <div className="p-3 sm:p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-foreground truncate text-sm sm:text-base">{list.name}</h3>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 sm:mt-1">
                {list.book_count || 0} كتاب
              </p>
            </div>
            <div className="flex items-center gap-1 sm:gap-2">
              {list.is_public ? (
                <Globe className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-green-500" />
              ) : (
                <Lock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground" />
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 sm:h-9 sm:w-9"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-popover z-50">
                  <DropdownMenuItem onClick={(e) => {
                    e.stopPropagation();
                    onEdit(list);
                  }}>
                    <Edit2 className="w-4 h-4 ml-2" />
                    تعديل
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(list.id);
                    }}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="w-4 h-4 ml-2" />
                    حذف
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
          {list.description && (
            <p className="text-xs sm:text-sm text-muted-foreground mt-1.5 sm:mt-2 line-clamp-2">
              {list.description}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

// Card for followed reading lists
const FollowedListCard = ({ 
  item, 
  onUnfollow, 
  onOpen 
}: { 
  item: FollowedReadingList; 
  onUnfollow: (listId: string) => void;
  onOpen: (list: any) => void;
}) => {
  const { data: books } = useReadingListBooks(item.list_id);
  const isMobile = useIsMobile();
  const list = item.reading_list;

  if (!list) return null;

  return (
    <Card 
      className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer group active:scale-[0.98]"
      onClick={() => onOpen({ ...list, book_count: item.book_count })}
    >
      <CardContent className="p-0">
        {/* Cover - Custom or Book Grid */}
        <div className="h-36 sm:h-44 bg-muted relative overflow-hidden flex items-center justify-center">
          {list.cover_url ? (
            <img
              src={list.cover_url}
              alt={list.name}
              loading="lazy"
              decoding="async"
              className="w-full h-full object-contain"
            />
          ) : books && books.length > 0 ? (
            <div className="w-full h-full grid grid-cols-4 gap-0.5 p-1">
              {books.slice(0, 4).map((bookItem) => (
                <div key={bookItem.id} className="bg-background overflow-hidden rounded-sm">
                  {bookItem.book?.cover_url ? (
                    <img
                      src={bookItem.book.cover_url}
                      alt={bookItem.book.title}
                      loading="lazy"
                      decoding="async"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-muted">
                      <BookOpen className="w-4 h-4 text-muted-foreground" />
                    </div>
                  )}
                </div>
              ))}
              {[...Array(Math.max(0, 4 - (books?.length || 0)))].map((_, i) => (
                <div key={`empty-${i}`} className="bg-muted/50 rounded-sm" />
              ))}
            </div>
          ) : (
            <div className="w-full h-full flex items-end justify-start bg-gradient-to-br from-primary/5 to-primary/10">
              <div className="m-3 inline-flex items-center gap-2 rounded-full bg-background/90 px-3 py-1.5 text-xs text-muted-foreground shadow-sm border border-muted-foreground/10">
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                  <BookOpen className="w-3.5 h-3.5 text-primary/60" />
                </div>
                <span>قائمة فارغة</span>
              </div>
            </div>
          )}
          {/* Overlay on hover/tap */}
          <div className={`absolute inset-0 bg-primary/10 transition-opacity flex items-center justify-center ${isMobile ? 'opacity-0 active:opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
            <span className="bg-background/90 text-foreground px-3 py-1.5 rounded-full text-xs sm:text-sm font-medium">
              عرض الكتب
            </span>
          </div>
        </div>

        {/* Info */}
        <div className="p-3 sm:p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-foreground truncate text-sm sm:text-base">{list.name}</h3>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 sm:mt-1">
                {item.book_count || 0} كتاب
              </p>
            </div>
            <div className="flex items-center gap-1 sm:gap-2">
              <Globe className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-green-500" />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 sm:h-9 sm:w-9"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-popover z-50">
                  <DropdownMenuItem 
                    onClick={(e) => {
                      e.stopPropagation();
                      onUnfollow(item.list_id);
                    }}
                    className="text-destructive focus:text-destructive"
                  >
                    <UserMinus className="w-4 h-4 ml-2" />
                    إلغاء المتابعة
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
          
          {/* Owner info */}
          {item.owner && (
            <div className="flex items-center gap-2 mt-2 pt-2 border-t border-border">
              <Avatar className="h-5 w-5">
                <AvatarImage src={item.owner.avatar_url || ''} />
                <AvatarFallback className="text-[10px]">
                  {(item.owner.full_name || item.owner.username || 'م')?.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <span className="text-xs text-muted-foreground truncate">
                {item.owner.full_name || item.owner.username || 'مستخدم'}
              </span>
            </div>
          )}
          
          {list.description && (
            <p className="text-xs sm:text-sm text-muted-foreground mt-1.5 sm:mt-2 line-clamp-2">
              {list.description}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Component to show books inside a reading list with drag and drop
const ReadingListBooksSheet = ({ 
  list, 
  isOpen, 
  onClose 
}: { 
  list: any; 
  isOpen: boolean; 
  onClose: () => void;
}) => {
  const { data: books, isLoading } = useReadingListBooks(list?.id);
  const { removeBookFromList, reorderBooks } = useReadingLists();
  const navigate = useNavigate();
  const [draggedItem, setDraggedItem] = useState<string | null>(null);
  const [dragOverItem, setDragOverItem] = useState<string | null>(null);
  const [localBooks, setLocalBooks] = useState<ReadingListBook[]>([]);
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    if (!list?.is_public) {
      toast.error('يجب أن تكون القائمة عامة للمشاركة');
      return;
    }
    
    const shareUrl = `${window.location.origin}/reading-list/${list.id}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: list.name,
          text: list.description || 'شاهد قائمة القراءة هذه',
          url: shareUrl,
        });
      } catch (err) {
        copyToClipboard(shareUrl);
      }
    } else {
      copyToClipboard(shareUrl);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success('تم نسخ الرابط');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error('فشل نسخ الرابط');
    }
  };

  // Sync local books with fetched books
  useState(() => {
    if (books) {
      setLocalBooks(books);
    }
  });

  // Update local books when fetched books change
  if (books && JSON.stringify(books.map(b => b.id)) !== JSON.stringify(localBooks.map(b => b.id))) {
    setLocalBooks(books);
  }

  const handleBookClick = (bookId: string) => {
    onClose();
    navigate(`/book/${bookId}`);
  };

  const handleDragStart = (e: React.DragEvent, bookId: string) => {
    setDraggedItem(bookId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', bookId);
  };

  const handleDragOver = (e: React.DragEvent, bookId: string) => {
    e.preventDefault();
    if (bookId !== draggedItem) {
      setDragOverItem(bookId);
    }
  };

  const handleDragLeave = () => {
    setDragOverItem(null);
  };

  const handleDrop = (e: React.DragEvent, targetBookId: string) => {
    e.preventDefault();
    
    if (!draggedItem || draggedItem === targetBookId || !localBooks) return;

    const draggedIndex = localBooks.findIndex(b => b.book_id === draggedItem);
    const targetIndex = localBooks.findIndex(b => b.book_id === targetBookId);
    
    if (draggedIndex === -1 || targetIndex === -1) return;

    // Reorder locally first for immediate feedback
    const newBooks = [...localBooks];
    const [removed] = newBooks.splice(draggedIndex, 1);
    newBooks.splice(targetIndex, 0, removed);
    setLocalBooks(newBooks);

    // Save to database
    reorderBooks({
      listId: list.id,
      bookIds: newBooks.map(b => b.book_id)
    });

    setDraggedItem(null);
    setDragOverItem(null);
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
    setDragOverItem(null);
  };

  const displayBooks = localBooks.length > 0 ? localBooks : books;

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="bottom" hideCloseButton className="h-[85vh] sm:h-full sm:max-h-full rounded-t-2xl sm:rounded-none sm:w-full sm:max-w-lg sm:!right-0 sm:!left-auto sm:!top-0 sm:!bottom-0">
        <SheetHeader className="mb-3 sm:mb-4 relative">
          <div className="flex items-center justify-between">
            <SheetTitle className="flex items-center gap-2 text-base sm:text-lg">
              <BookOpen className="w-5 h-5" />
              {list?.name}
            </SheetTitle>
            <div className="flex items-center gap-1 absolute left-0 top-0">
              {list?.is_public && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={handleShare}
                  title="مشاركة القائمة"
                >
                  {copied ? <Check className="w-4 h-4 text-green-500" /> : <Share2 className="w-4 h-4" />}
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={onClose}
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
            <span>{list?.book_count || 0} كتاب في هذه القائمة</span>
            {list?.is_public && (
              <span className="flex items-center gap-1 text-green-500">
                <Globe className="w-3 h-3" />
                عامة
              </span>
            )}
            {displayBooks && displayBooks.length > 1 && (
              <span className="text-[10px] sm:text-xs">• اسحب لإعادة الترتيب</span>
            )}
          </div>
        </SheetHeader>
        
        <ScrollArea className="h-[calc(85vh-120px)] sm:h-[calc(100vh-150px)]">
          {isLoading ? (
            <div className="space-y-2 sm:space-y-3">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-20 sm:h-24 w-full rounded-lg" />
              ))}
            </div>
          ) : !displayBooks || displayBooks.length === 0 ? (
            <div className="text-center py-8 sm:py-12">
              <BookOpen className="w-12 h-12 sm:w-16 sm:h-16 mx-auto text-muted-foreground/50 mb-3 sm:mb-4" />
              <p className="text-sm sm:text-base text-muted-foreground">لا توجد كتب في هذه القائمة</p>
              <Button 
                variant="outline" 
                className="mt-3 sm:mt-4 h-10 sm:h-11"
                onClick={() => {
                  onClose();
                  navigate('/');
                }}
              >
                تصفح الكتب
              </Button>
            </div>
          ) : (
            <div className="space-y-2 pb-4">
              {displayBooks.map((item, index) => (
                <div
                  key={item.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, item.book_id)}
                  onDragOver={(e) => handleDragOver(e, item.book_id)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, item.book_id)}
                  onDragEnd={handleDragEnd}
                  className={`flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-xl transition-all cursor-grab active:cursor-grabbing group ${
                    draggedItem === item.book_id 
                      ? 'opacity-50 scale-95' 
                      : dragOverItem === item.book_id 
                        ? 'bg-primary/20 border-2 border-primary border-dashed' 
                        : 'bg-muted/50 hover:bg-muted active:bg-muted'
                  }`}
                >
                  {/* Delete Button - Left side */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive flex-shrink-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeBookFromList({ listId: list.id, bookId: item.book_id });
                    }}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                  
                  {/* Book Cover */}
                  <div 
                    className="w-12 h-16 sm:w-14 sm:h-20 rounded-lg overflow-hidden bg-muted flex-shrink-0 cursor-pointer"
                    onClick={() => handleBookClick(item.book_id)}
                  >
                    {item.book?.cover_url ? (
                      <img
                        src={item.book.cover_url}
                        alt={item.book.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <BookOpen className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  
                  {/* Book Info */}
                  <div 
                    className="flex-1 min-w-0 cursor-pointer"
                    onClick={() => handleBookClick(item.book_id)}
                  >
                    <h4 className="font-medium text-foreground line-clamp-2 group-hover:text-primary transition-colors text-xs sm:text-sm">
                      {item.book?.title || 'كتاب غير معروف'}
                    </h4>
                    <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 sm:mt-1">
                      {item.book?.author || 'مؤلف غير معروف'}
                    </p>
                    {item.notes && (
                      <p className="text-[9px] sm:text-[10px] text-muted-foreground mt-0.5 sm:mt-1 line-clamp-1">
                        📝 {item.notes}
                      </p>
                    )}
                  </div>
                  
                  {/* Drag Handle - Right side */}
                  <div className="flex items-center justify-center w-6 sm:w-8 text-muted-foreground flex-shrink-0">
                    <GripVertical className="w-4 h-4 sm:w-5 sm:h-5" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
};

// Responsive Modal - Sheet on Mobile, Dialog on Desktop
const CreateEditListModal = ({
  isOpen,
  onClose,
  editingList,
  formData,
  setFormData,
  onSubmit,
  isCreating,
  userId,
}: {
  isOpen: boolean;
  onClose: () => void;
  editingList: any;
  formData: { name: string; description: string; is_public: boolean; cover_url: string | null };
  setFormData: React.Dispatch<React.SetStateAction<{ name: string; description: string; is_public: boolean; cover_url: string | null }>>;
  onSubmit: () => void;
  isCreating: boolean;
  userId: string;
}) => {
  const isMobile = useIsMobile();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingCover, setUploadingCover] = useState(false);

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('يرجى اختيار صورة فقط');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('حجم الصورة يجب أن يكون أقل من 5 ميجابايت');
      return;
    }

    setUploadingCover(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('reading-list-covers')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('reading-list-covers')
        .getPublicUrl(fileName);

      setFormData(prev => ({ ...prev, cover_url: publicUrl }));
      toast.success('تم رفع الصورة بنجاح');
    } catch (error) {
      console.error('Error uploading cover:', error);
      toast.error('فشل في رفع الصورة');
    } finally {
      setUploadingCover(false);
    }
  };

  const removeCover = () => {
    setFormData(prev => ({ ...prev, cover_url: null }));
  };

  const FormContent = () => (
    <div className="space-y-6">
      {/* Cover Image Upload - Centered */}
      <div className="flex flex-col items-center">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleCoverUpload}
          className="hidden"
        />
        {formData.cover_url ? (
          <div className="relative group">
            <div className="w-28 h-28 rounded-2xl overflow-hidden ring-2 ring-primary/20 shadow-lg">
              <img 
                src={formData.cover_url} 
                alt="غلاف القائمة" 
                className="w-full h-full object-cover"
              />
            </div>
            <div className="absolute inset-0 rounded-2xl bg-black/60 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingCover}
                className="w-9 h-9 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-colors"
              >
                <ImagePlus className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={removeCover}
                className="w-9 h-9 rounded-full bg-destructive/80 hover:bg-destructive flex items-center justify-center text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadingCover}
            className="w-28 h-28 rounded-2xl border-2 border-dashed border-primary/40 hover:border-primary hover:bg-primary/5 transition-all flex flex-col items-center justify-center gap-2 text-muted-foreground hover:text-primary"
          >
            {uploadingCover ? (
              <Loader2 className="w-7 h-7 animate-spin text-primary" />
            ) : (
              <>
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <ImagePlus className="w-6 h-6 text-primary" />
                </div>
                <span className="text-xs font-medium">صورة الغلاف</span>
              </>
            )}
          </button>
        )}
        <p className="text-[11px] text-muted-foreground mt-2">اختياري - اضغط لإضافة صورة</p>
      </div>

      {/* List Name */}
      <div className="space-y-2">
        <Label htmlFor="list-name" className="text-sm font-medium text-foreground flex items-center gap-1">
          اسم القائمة
          <span className="text-destructive">*</span>
        </Label>
        <Input
          id="list-name"
          placeholder="مثال: كتب للقراءة لاحقاً"
          value={formData.name}
          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
          className="h-12 text-base rounded-xl bg-muted/40 border-muted-foreground/20 focus:border-primary focus:bg-background transition-colors"
        />
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="list-description" className="text-sm font-medium text-foreground">
          الوصف
          <span className="text-muted-foreground text-xs mr-1">(اختياري)</span>
        </Label>
        <Textarea
          id="list-description"
          placeholder="وصف قصير للقائمة..."
          value={formData.description}
          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
          rows={3}
          className="text-base rounded-xl bg-muted/40 border-muted-foreground/20 focus:border-primary focus:bg-background resize-none transition-colors"
        />
      </div>

      {/* Public Toggle */}
      <div className="flex items-center justify-between p-4 rounded-xl bg-muted/40 border border-muted-foreground/10">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${formData.is_public ? 'bg-green-500/20 text-green-500' : 'bg-muted text-muted-foreground'}`}>
            {formData.is_public ? <Globe className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
          </div>
          <div>
            <Label htmlFor="is-public" className="cursor-pointer text-foreground font-medium">
              {formData.is_public ? 'قائمة عامة' : 'قائمة خاصة'}
            </Label>
            <p className="text-xs text-muted-foreground">
              {formData.is_public ? 'يمكن للآخرين رؤية هذه القائمة' : 'أنت فقط من يمكنه رؤية هذه القائمة'}
            </p>
          </div>
        </div>
        <Switch
          id="is-public"
          checked={formData.is_public}
          onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_public: checked }))}
        />
      </div>
    </div>
  );

  const ActionButtons = () => (
    <div className="flex gap-3 pt-5">
      <Button 
        onClick={onSubmit} 
        disabled={isCreating || !formData.name.trim() || uploadingCover} 
        className="flex-1 h-12 rounded-xl bg-primary hover:bg-primary/90 font-semibold text-base shadow-lg shadow-primary/20"
      >
        {isCreating ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          editingList ? 'حفظ التغييرات' : 'إنشاء القائمة'
        )}
      </Button>
      <Button 
        variant="outline" 
        onClick={onClose} 
        className="flex-1 h-12 rounded-xl border-muted-foreground/20 font-medium text-base"
      >
        إلغاء
      </Button>
    </div>
  );

  // Mobile: Bottom Sheet
  if (isMobile) {
    return (
      <Sheet open={isOpen} onOpenChange={onClose}>
        <SheetContent 
          side="bottom" 
          hideCloseButton
          className="h-auto max-h-[92vh] rounded-t-[28px] px-5 pb-8 pt-4 overflow-y-auto"
        >
          {/* Drag Handle */}
          <div className="flex justify-center mb-3">
            <div className="w-10 h-1 bg-muted-foreground/25 rounded-full" />
          </div>
          
          <SheetHeader className="mb-5">
            <SheetTitle className="text-xl font-bold text-center text-foreground">
              {editingList ? 'تعديل القائمة' : 'إنشاء قائمة جديدة'}
            </SheetTitle>
          </SheetHeader>
          
          <FormContent />
          <ActionButtons />
        </SheetContent>
      </Sheet>
    );
  }

  // Desktop: Centered Dialog
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[420px] max-h-[90vh] overflow-y-auto p-6 rounded-2xl">
        <DialogHeader className="mb-5">
          <DialogTitle className="text-xl font-bold text-center">
            {editingList ? 'تعديل القائمة' : 'إنشاء قائمة جديدة'}
          </DialogTitle>
        </DialogHeader>
        
        <FormContent />
        <ActionButtons />
      </DialogContent>
    </Dialog>
  );
};

const ReadingLists = () => {
  const { user, loading: authLoading } = useAuth();
  const { lists, isLoading, createList, updateList, deleteList, isCreating } = useReadingLists();
  const { followedLists, isLoading: followedLoading, unfollowList } = useFollowedReadingLists();
  const [showDialog, setShowDialog] = useState(false);
  const [editingList, setEditingList] = useState<any>(null);
  const [selectedList, setSelectedList] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('my-lists');
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    is_public: false,
    cover_url: null as string | null,
  });

  useSEO({
    title: 'قوائم القراءة - مكتبة',
    description: 'إنشاء وإدارة قوائم القراءة الخاصة بك',
  });

  if (authLoading) {
    return (
      <Layout>
        <div className="section-container py-12">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="aspect-[3/4] rounded-xl" />
            ))}
          </div>
        </div>
      </Layout>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  const handleOpenDialog = (list?: any) => {
    if (list) {
      setEditingList(list);
      setFormData({
        name: list.name,
        description: list.description || '',
        is_public: list.is_public,
        cover_url: list.cover_url || null,
      });
    } else {
      setEditingList(null);
      setFormData({ name: '', description: '', is_public: false, cover_url: null });
    }
    setShowDialog(true);
  };

  const handleSubmit = () => {
    if (!formData.name.trim()) return;

    if (editingList) {
      updateList({
        id: editingList.id,
        name: formData.name,
        description: formData.description || undefined,
        is_public: formData.is_public,
        cover_url: formData.cover_url,
      });
    } else {
      createList({
        name: formData.name,
        description: formData.description || undefined,
        is_public: formData.is_public,
        cover_url: formData.cover_url,
      });
    }
    setShowDialog(false);
  };

  const EmptyState = ({ icon: Icon, title, description, action }: { 
    icon: any; 
    title: string; 
    description: string;
    action?: { label: string; onClick?: () => void; to?: string };
  }) => (
    <div className="text-center py-12 sm:py-16 px-4">
      <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-muted flex items-center justify-center mx-auto mb-4 sm:mb-6">
        <Icon className="w-8 h-8 sm:w-10 sm:h-10 text-muted-foreground" />
      </div>
      <h3 className="text-lg sm:text-xl font-semibold text-foreground mb-2">{title}</h3>
      <p className="text-sm sm:text-base text-muted-foreground mb-4 sm:mb-6">{description}</p>
      {action && (
        action.to ? (
          <Button asChild className="gap-2 h-11 rounded-xl">
            <Link to={action.to}>{action.label}</Link>
          </Button>
        ) : (
          <Button onClick={action.onClick} className="gap-2 h-11 rounded-xl">
            <Plus className="w-4 h-4" />
            {action.label}
          </Button>
        )
      )}
    </div>
  );

  return (
    <Layout>
      <div className="section-container py-6 sm:py-12 px-4 sm:px-6">
        {/* Header - All in one row */}
        <div className="flex flex-col lg:flex-row lg:items-center gap-4 mb-6 sm:mb-8">
          {/* Title */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <List className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground">قوائم القراءة</h1>
              <p className="text-xs sm:text-sm text-muted-foreground hidden sm:block">نظم كتبك في قوائم مخصصة</p>
            </div>
          </div>

          {/* Tabs + Buttons in one row */}
          <div className="flex items-center justify-between lg:justify-end gap-3 flex-1">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-shrink-0">
              <TabsList className="h-10 sm:h-11 p-1 bg-muted rounded-xl">
                <TabsTrigger 
                  value="my-lists" 
                  className="h-full rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm gap-1.5 sm:gap-2 px-3 sm:px-4 text-xs sm:text-sm"
                >
                  <List className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span>قوائمي</span>
                  {lists.length > 0 && (
                    <span className="bg-primary text-primary-foreground text-[10px] sm:text-xs px-1.5 py-0.5 rounded-full">
                      {lists.length}
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger 
                  value="following" 
                  className="h-full rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm gap-1.5 sm:gap-2 px-3 sm:px-4 text-xs sm:text-sm"
                >
                  <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span>أتابعها</span>
                  {followedLists.length > 0 && (
                    <span className="bg-green-500 text-white text-[10px] sm:text-xs px-1.5 py-0.5 rounded-full">
                      {followedLists.length}
                    </span>
                  )}
                </TabsTrigger>
              </TabsList>
            </Tabs>
            
            <div className="flex items-center gap-2">
              <Link to="/explore-lists">
                <Button variant="outline" className="h-10 sm:h-11 px-3 sm:px-4 gap-2">
                  <Globe className="w-4 h-4" />
                  <span className="hidden sm:inline">استكشف</span>
                </Button>
              </Link>
              <Button onClick={() => handleOpenDialog()} className="h-10 sm:h-11 px-3 sm:px-4 gap-2">
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">جديدة</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Tabs Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="hidden">
          <TabsList className="hidden" />
        </Tabs>

        {/* Content based on active tab */}
        {activeTab === 'my-lists' && (
          <>
            {isLoading ? (
              <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
                {[...Array(6)].map((_, i) => (
                  <Skeleton key={i} className="aspect-[4/5] rounded-xl" />
                ))}
              </div>
            ) : lists.length === 0 ? (
              <EmptyState
                icon={List}
                title="لا توجد قوائم بعد"
                description="أنشئ قائمتك الأولى لتنظيم كتبك المفضلة"
                action={{ label: 'إنشاء قائمة', onClick: () => handleOpenDialog() }}
              />
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
                {lists.map((list) => (
                  <ReadingListCard
                    key={list.id}
                    list={list}
                    onEdit={handleOpenDialog}
                    onDelete={deleteList}
                    onOpen={setSelectedList}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {activeTab === 'following' && (
          <>
            {followedLoading ? (
              <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
                {[...Array(6)].map((_, i) => (
                  <Skeleton key={i} className="aspect-[4/5] rounded-xl" />
                ))}
              </div>
            ) : followedLists.length === 0 ? (
              <EmptyState
                icon={Users}
                title="لا تتابع أي قوائم"
                description="استكشف القوائم العامة وتابع ما يناسب اهتماماتك"
                action={{ label: 'استكشف القوائم', to: '/explore-lists' }}
              />
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
                {followedLists.map((item) => (
                  <FollowedListCard
                    key={item.id}
                    item={item}
                    onUnfollow={unfollowList}
                    onOpen={setSelectedList}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {/* Reading List Books Sheet */}
        <ReadingListBooksSheet 
          list={selectedList}
          isOpen={!!selectedList}
          onClose={() => setSelectedList(null)}
        />

        {/* Create/Edit - Sheet on Mobile, Dialog on Desktop */}
        <CreateEditListModal 
          isOpen={showDialog}
          onClose={() => setShowDialog(false)}
          editingList={editingList}
          formData={formData}
          setFormData={setFormData}
          onSubmit={handleSubmit}
          isCreating={isCreating}
          userId={user.id}
        />
      </div>
    </Layout>
  );
};

export default ReadingLists;
