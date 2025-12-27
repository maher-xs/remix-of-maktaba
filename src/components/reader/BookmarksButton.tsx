import { useState } from 'react';
import { Bookmark, BookmarkCheck, Trash2, ChevronDown, ChevronUp, StickyNote } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useBookBookmarks } from '@/hooks/useBookBookmarks';
import { useAuth } from '@/hooks/useAuth';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';

interface BookmarksButtonProps {
  bookId: string;
  currentPage: number;
  onGoToPage: (page: number) => void;
  isMobile?: boolean;
}

const BookmarksButton = ({ bookId, currentPage, onGoToPage, isMobile = false }: BookmarksButtonProps) => {
  const { user } = useAuth();
  const { 
    bookmarks, 
    isPageBookmarked, 
    toggleBookmark,
    removeBookmark,
    isLoading 
  } = useBookBookmarks(bookId);
  const [isOpen, setIsOpen] = useState(false);

  if (!user) return null;

  const isCurrentPageBookmarked = isPageBookmarked(currentPage);

  const handleGoToPage = (page: number) => {
    onGoToPage(page);
    setIsOpen(false);
  };

  return (
    <div className={`flex items-center ${isMobile ? 'gap-0' : 'gap-1'}`}>
      {/* Toggle bookmark for current page */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className={`${isMobile ? 'min-w-[44px] min-h-[44px] rounded-xl' : 'h-9 w-9'} ${isCurrentPageBookmarked ? 'text-primary bg-primary/20' : isMobile ? 'text-foreground hover:bg-muted' : ''}`}
            onClick={() => toggleBookmark(currentPage)}
          >
            {isCurrentPageBookmarked ? (
              <BookmarkCheck className={`${isMobile ? 'h-5 w-5' : 'w-5 h-5'} fill-primary`} />
            ) : (
              <Bookmark className={`${isMobile ? 'h-5 w-5' : 'w-5 h-5'}`} />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          {isCurrentPageBookmarked ? 'إزالة الإشارة' : 'إضافة إشارة مرجعية'}
        </TooltipContent>
      </Tooltip>

      {/* Bookmarks list */}
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="sm" className={`gap-1 text-xs ${isMobile ? 'min-w-[36px] min-h-[44px] px-2' : ''}`}>
            <span>{bookmarks.length}</span>
            {isOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </Button>
        </SheetTrigger>
        <SheetContent side={isMobile ? "bottom" : "left"} className={isMobile ? "h-[70vh]" : "w-80"}>
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Bookmark className="w-5 h-5" />
              الإشارات المرجعية ({bookmarks.length})
            </SheetTitle>
          </SheetHeader>
          
          <ScrollArea className="h-[calc(100vh-100px)] mt-4">
            {isLoading ? (
              <div className="text-center text-muted-foreground py-8">
                جاري التحميل...
              </div>
            ) : bookmarks.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                <Bookmark className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>لا توجد إشارات مرجعية</p>
                <p className="text-sm mt-1">اضغط على أيقونة الإشارة لحفظ الصفحة</p>
              </div>
            ) : (
              <div className="space-y-2">
                {bookmarks.map((bookmark) => (
                  <div
                    key={bookmark.id}
                    className={`p-3 rounded-lg border transition-colors cursor-pointer ${
                      bookmark.page_number === currentPage 
                        ? 'bg-primary/10 border-primary' 
                        : 'bg-muted/50 border-border hover:bg-muted'
                    }`}
                    onClick={() => handleGoToPage(bookmark.page_number)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">
                          {bookmark.title || `صفحة ${bookmark.page_number}`}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          صفحة {bookmark.page_number}
                        </p>
                        {bookmark.note && (
                          <div className="flex items-start gap-1 mt-2 text-xs text-muted-foreground">
                            <StickyNote className="w-3 h-3 mt-0.5 flex-shrink-0" />
                            <p className="line-clamp-2">{bookmark.note}</p>
                          </div>
                        )}
                        <p className="text-[10px] text-muted-foreground mt-1">
                          {formatDistanceToNow(new Date(bookmark.created_at), { addSuffix: true, locale: ar })}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive flex-shrink-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeBookmark(bookmark.page_number);
                        }}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default BookmarksButton;
