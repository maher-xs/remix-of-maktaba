import { useState, useRef, useCallback, useEffect } from 'react';
import { Document, Page } from 'react-pdf';
import { 
  ZoomIn, 
  ZoomOut, 
  ArrowRight,
  Download,
  List,
  Home,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Rows3,
  Columns2,
  Sun,
  Moon,
  PenLine,
  MessageSquare,
  Hash,
  RotateCw,
  BookmarkCheck
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useOnlineStatus } from '@/hooks/useOfflineStorage';
import { useTheme } from '@/hooks/useTheme';
import QuickNoteModal from './QuickNoteModal';
import BookmarksButton from './BookmarksButton';

interface MobileReaderProps {
  pdfUrl: string;
  bookTitle: string;
  bookAuthor?: string;
  bookId: string;
  numPages: number;
  currentPage: number;
  scale: number;
  annotations: any[];
  isAuthenticated: boolean;
  onPageChange: (page: number) => void;
  onScaleChange: (scale: number) => void;
  onDocumentLoad: (data: { numPages: number }) => void;
  onDocumentError: (error: any) => void;
  onDownload: () => void;
  onNavigateBack: () => void;
  onNavigateHome: () => void;
  onGoToPage: (page: number) => void;
}

type ReadingMode = 'vertical' | 'horizontal';

const MobileReader = ({
  pdfUrl,
  bookTitle,
  bookAuthor,
  bookId,
  numPages,
  currentPage,
  scale,
  annotations,
  isAuthenticated,
  onPageChange,
  onScaleChange,
  onDocumentLoad,
  onDocumentError,
  onDownload,
  onNavigateBack,
  onNavigateHome,
  onGoToPage
}: MobileReaderProps) => {
  const [showControls, setShowControls] = useState(true);
  const [showTOC, setShowTOC] = useState(false);
  const [showAnnotations, setShowAnnotations] = useState(false);
  const [showQuickNote, setShowQuickNote] = useState(false);
  const [loading, setLoading] = useState(true);
  const [goToPageInput, setGoToPageInput] = useState('');
  const [rotation, setRotation] = useState(0);
  const [readingMode, setReadingMode] = useState<ReadingMode>(() => {
    const saved = localStorage.getItem('mobile-reading-mode');
    return (saved as ReadingMode) || 'horizontal';
  });
  const isOnline = useOnlineStatus();
  const { isDark, setTheme } = useTheme();
  
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const lastTapTime = useRef(0);
  const pageRefs = useRef<(HTMLDivElement | null)[]>([]);
  
  // Touch gesture state for horizontal mode
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  
  // Save reading mode preference
  useEffect(() => {
    localStorage.setItem('mobile-reading-mode', readingMode);
  }, [readingMode]);
  
  // Auto-hide controls
  useEffect(() => {
    let timeout: NodeJS.Timeout;
    if (showControls) {
      timeout = setTimeout(() => setShowControls(false), 4000);
    }
    return () => clearTimeout(timeout);
  }, [showControls]);
  
  // Update current page based on scroll position (vertical mode)
  useEffect(() => {
    if (readingMode !== 'vertical') return;
    
    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer || numPages === 0) return;
    
    const handleScroll = () => {
      let mostVisiblePage = 1;
      let maxVisibility = 0;
      
      pageRefs.current.forEach((pageRef, index) => {
        if (pageRef) {
          const rect = pageRef.getBoundingClientRect();
          const containerRect = scrollContainer.getBoundingClientRect();
          
          const visibleTop = Math.max(rect.top, containerRect.top);
          const visibleBottom = Math.min(rect.bottom, containerRect.bottom);
          const visibleHeight = Math.max(0, visibleBottom - visibleTop);
          
          if (visibleHeight > maxVisibility) {
            maxVisibility = visibleHeight;
            mostVisiblePage = index + 1;
          }
        }
      });
      
      if (mostVisiblePage !== currentPage) {
        onPageChange(mostVisiblePage);
      }
    };
    
    scrollContainer.addEventListener('scroll', handleScroll, { passive: true });
    return () => scrollContainer.removeEventListener('scroll', handleScroll);
  }, [numPages, currentPage, onPageChange, readingMode]);
  
  // Scroll to page when page changes externally (vertical mode)
  const scrollToPage = useCallback((page: number) => {
    if (readingMode !== 'vertical') return;
    const pageRef = pageRefs.current[page - 1];
    if (pageRef && scrollContainerRef.current) {
      pageRef.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [readingMode]);
  
  const handleNextPage = useCallback(() => {
    if (currentPage < numPages) {
      onPageChange(currentPage + 1);
    }
  }, [currentPage, numPages, onPageChange]);
  
  const handlePrevPage = useCallback(() => {
    if (currentPage > 1) {
      onPageChange(currentPage - 1);
    }
  }, [currentPage, onPageChange]);
  
  // Handle touch start (horizontal mode)
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (readingMode !== 'horizontal') return;
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  }, [readingMode]);
  
  // Handle touch move (horizontal mode)
  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (readingMode !== 'horizontal') return;
    const deltaX = Math.abs(e.touches[0].clientX - touchStartX.current);
    const deltaY = Math.abs(e.touches[0].clientY - touchStartY.current);
    
    if (deltaX > deltaY && deltaX > 10) {
      e.preventDefault();
    }
  }, [readingMode]);
  
  // Handle touch end (horizontal mode)
  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (readingMode !== 'horizontal') return;
    
    const endX = e.changedTouches[0].clientX;
    const endY = e.changedTouches[0].clientY;
    const deltaX = endX - touchStartX.current;
    const deltaY = Math.abs(endY - touchStartY.current);
    
    const minSwipeDistance = 40;
    const isHorizontalSwipe = Math.abs(deltaX) > deltaY * 1.5;
    
    if (isHorizontalSwipe && Math.abs(deltaX) > minSwipeDistance) {
      e.preventDefault();
      e.stopPropagation();
      
      // RTL: سحب لليمين = الصفحة التالية، سحب لليسار = الصفحة السابقة
      if (deltaX > 0) {
        handleNextPage();
      } else {
        handlePrevPage();
      }
      return;
    }
    
    // Double tap to zoom
    const currentTime = new Date().getTime();
    const tapLength = currentTime - lastTapTime.current;
    if (tapLength < 300 && tapLength > 0 && Math.abs(deltaX) < 10 && deltaY < 10) {
      onScaleChange(scale === 1 ? 1.5 : 1);
    }
    lastTapTime.current = currentTime;
  }, [readingMode, scale, onScaleChange, handlePrevPage, handleNextPage]);
  
  // Handle tap to toggle controls
  const handleTap = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('[role="slider"]')) return;
    
    if (readingMode === 'vertical') {
      const currentTime = new Date().getTime();
      const tapLength = currentTime - lastTapTime.current;
      if (tapLength < 300 && tapLength > 0) {
        onScaleChange(scale === 1 ? 1.5 : 1);
      } else {
        setShowControls(prev => !prev);
      }
      lastTapTime.current = currentTime;
    } else {
      setShowControls(prev => !prev);
    }
  }, [readingMode, scale, onScaleChange]);
  
  const handleDocumentLoad = (data: { numPages: number }) => {
    setLoading(false);
    onDocumentLoad(data);
  };
  
  const handleGoToPage = (page: number) => {
    onGoToPage(page);
    setShowTOC(false);
    setShowAnnotations(false);
    if (readingMode === 'vertical') {
      setTimeout(() => scrollToPage(page), 100);
    }
  };
  
  const handleGoToPageSubmit = () => {
    const page = parseInt(goToPageInput);
    if (page >= 1 && page <= numPages) {
      handleGoToPage(page);
      setGoToPageInput('');
    }
  };
  
  const toggleReadingMode = () => {
    setReadingMode(prev => prev === 'vertical' ? 'horizontal' : 'vertical');
  };
  
  const toggleTheme = () => {
    setTheme(isDark ? 'light' : 'dark');
  };
  
  const rotatePage = () => {
    setRotation(prev => (prev + 90) % 360);
  };
  
  // Truncate title
  const truncatedTitle = bookTitle.length > 25 ? bookTitle.slice(0, 25) + '...' : bookTitle;
  
  const progress = numPages > 0 ? (currentPage / numPages) * 100 : 0;
  
  // Get notes and bookmarks count
  const notesCount = annotations.filter(a => a.annotation_type === 'note').length;
  const bookmarksCount = annotations.filter(a => a.annotation_type === 'bookmark').length;
  
  return (
    <div 
      className="fixed inset-0 z-50 flex flex-col bg-background"
      ref={containerRef}
    >
      {/* Top Bar */}
      <div 
        className={`absolute top-0 left-0 right-0 z-50 transition-all duration-300 ${
          showControls 
            ? 'opacity-100 translate-y-0' 
            : 'opacity-0 -translate-y-full pointer-events-none'
        }`}
      >
        <div className="bg-background/95 backdrop-blur-sm border-b border-border safe-area-top">
          <div className="flex items-center justify-between px-2 py-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={onNavigateBack}
              className="text-foreground hover:bg-muted min-w-[44px] min-h-[44px] rounded-xl"
            >
              <ArrowRight className="h-5 w-5" />
            </Button>
            
            <div className="flex-1 mx-2 text-center overflow-hidden">
              <h1 className="font-bold text-sm truncate text-foreground">{truncatedTitle}</h1>
              {bookAuthor && <p className="text-xs text-muted-foreground truncate">{bookAuthor}</p>}
            </div>
            
            <div className="flex items-center">
              {/* Theme Toggle */}
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleTheme}
                className="text-foreground hover:bg-muted min-w-[44px] min-h-[44px] rounded-xl"
              >
                {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </Button>
              
              {/* Bookmarks Button - Only when online */}
              {isAuthenticated && isOnline && (
                <BookmarksButton 
                  bookId={bookId} 
                  currentPage={currentPage} 
                  onGoToPage={handleGoToPage}
                  isMobile={true}
                />
              )}
              
              <Button
                variant="ghost"
                size="icon"
                onClick={onNavigateHome}
                className="text-foreground hover:bg-muted min-w-[44px] min-h-[44px] rounded-xl"
              >
                <Home className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </div>
      
      {/* PDF Document */}
      {readingMode === 'vertical' ? (
        // Vertical Scroll Mode
        <div 
          ref={scrollContainerRef}
          className="flex-1 overflow-y-auto overflow-x-hidden pt-16 pb-48"
          onClick={handleTap}
        >
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-background z-10">
              <div className="text-center">
                <div className="w-16 h-16 rounded-2xl bg-primary/20 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-primary/10">
                  <Loader2 className="h-10 w-10 animate-spin text-primary" />
                </div>
                <p className="text-muted-foreground">جاري تحميل الكتاب...</p>
              </div>
            </div>
          )}
          
          <Document
            file={pdfUrl}
            onLoadSuccess={handleDocumentLoad}
            onLoadError={onDocumentError}
            loading={null}
            className="flex flex-col items-center"
          >
            {Array.from({ length: numPages }, (_, index) => (
              <div
                key={index}
                ref={(el) => { pageRefs.current[index] = el; }}
                className="mb-3"
              >
                <Page
                  pageNumber={index + 1}
                  scale={scale}
                  rotate={rotation}
                  width={window.innerWidth - 16}
                  className="shadow-lg rounded-lg overflow-hidden"
                  renderTextLayer={false}
                  renderAnnotationLayer={false}
                  loading={
                    <div 
                      className="flex items-center justify-center bg-muted rounded-lg" 
                      style={{ width: window.innerWidth - 16, height: (window.innerWidth - 16) * 1.4 }}
                    >
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                  }
                />
              </div>
            ))}
          </Document>
        </div>
      ) : (
        // Horizontal Swipe Mode
        <div 
          className="flex-1 overflow-hidden flex items-center justify-center touch-pan-y"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onClick={handleTap}
        >
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-background">
              <div className="text-center">
                <div className="w-16 h-16 rounded-2xl bg-primary/20 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-primary/10">
                  <Loader2 className="h-10 w-10 animate-spin text-primary" />
                </div>
                <p className="text-muted-foreground">جاري تحميل الكتاب...</p>
              </div>
            </div>
          )}
          
          <Document
            file={pdfUrl}
            onLoadSuccess={handleDocumentLoad}
            onLoadError={onDocumentError}
            loading={null}
            className="flex justify-center"
          >
            <Page
              pageNumber={currentPage}
              scale={scale}
              rotate={rotation}
              width={window.innerWidth}
              className="[&_.react-pdf\_\_Page\_\_canvas]:!shadow-none [&_.react-pdf\_\_Page\_\_canvas]:border [&_.react-pdf\_\_Page\_\_canvas]:border-border/50"
              renderTextLayer={false}
              renderAnnotationLayer={false}
              loading={
                <div className="flex items-center justify-center bg-background" style={{ width: window.innerWidth, height: window.innerHeight * 0.7 }}>
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              }
            />
          </Document>
          
          {/* Navigation Touch Areas (horizontal mode) - RTL: اليمين = التالية، اليسار = السابقة */}
          <button
            onClick={handleNextPage}
            disabled={currentPage >= numPages}
            className="absolute right-0 top-20 bottom-48 w-16 opacity-0 active:opacity-10 active:bg-foreground z-30 disabled:pointer-events-none"
            aria-label="الصفحة التالية"
          />
          <button
            onClick={handlePrevPage}
            disabled={currentPage <= 1}
            className="absolute left-0 top-20 bottom-48 w-16 opacity-0 active:opacity-10 active:bg-foreground z-30 disabled:pointer-events-none"
            aria-label="الصفحة السابقة"
          />
        </div>
      )}
      
      {/* Annotations Sheet */}
      <Sheet open={showAnnotations} onOpenChange={setShowAnnotations}>
        <SheetContent side="bottom" className="h-[70vh] bg-card border-border">
          <div className="mb-4">
            <h2 className="text-lg font-bold text-center text-foreground">الملاحظات والإشارات</h2>
            <p className="text-center text-sm text-muted-foreground">{notesCount} ملاحظة • {bookmarksCount} إشارة</p>
          </div>
          <div className="overflow-y-auto h-full pb-20 space-y-2">
            {annotations.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>لا توجد ملاحظات بعد</p>
              </div>
            ) : (
              annotations.map((annotation) => (
                <button
                  key={annotation.id}
                  onClick={() => handleGoToPage(annotation.page_number)}
                  className="w-full p-3 rounded-xl bg-muted text-right hover:bg-muted/80 transition-colors"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-muted-foreground">صفحة {annotation.page_number}</span>
                    {annotation.annotation_type === 'bookmark' ? (
                      <BookmarkCheck className="w-4 h-4 text-primary" />
                    ) : (
                      <MessageSquare className="w-4 h-4 text-blue-500" />
                    )}
                  </div>
                  {annotation.content && (
                    <p className="text-sm text-foreground line-clamp-2">{annotation.content}</p>
                  )}
                </button>
              ))
            )}
          </div>
        </SheetContent>
      </Sheet>
      
      {/* Quick Note Modal */}
      {showQuickNote && isOnline && (
        <QuickNoteModal
          bookId={bookId}
          pageNumber={currentPage}
          onClose={() => setShowQuickNote(false)}
        />
      )}
      
      {/* Bottom Controls Bar */}
      <div 
        className={`absolute bottom-0 left-0 right-0 z-50 transition-all duration-300 ${
          showControls 
            ? 'opacity-100 translate-y-0' 
            : 'opacity-0 translate-y-full pointer-events-none'
        }`}
      >
        <div className="bg-background/95 backdrop-blur-sm border-t border-border safe-area-bottom">
          {/* Progress Bar */}
          <div className="px-4 pt-3">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span>صفحة {currentPage}</span>
              <span>{numPages} صفحة</span>
            </div>
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <div 
                className="h-full bg-primary rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
          
          {/* Page Slider (horizontal mode only) */}
          {readingMode === 'horizontal' && (
            <div className="px-4 py-2">
              <div className="flex items-center gap-3 bg-muted/50 rounded-2xl p-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handlePrevPage}
                  disabled={currentPage <= 1}
                  className="text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl h-8 w-8"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Slider
                  value={[currentPage]}
                  min={1}
                  max={numPages || 1}
                  step={1}
                  onValueChange={([value]) => onPageChange(value)}
                  className="flex-1"
                  dir="ltr"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleNextPage}
                  disabled={currentPage >= numPages}
                  className="text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl h-8 w-8"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
          
          {/* Action Buttons - Row 1 */}
          <div className="px-2 pt-2 flex items-center justify-around">
            {/* Table of Contents */}
            <Sheet open={showTOC} onOpenChange={setShowTOC}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="min-w-[52px] min-h-[52px] flex flex-col gap-0.5 text-foreground hover:bg-muted rounded-xl"
                >
                  <List className="h-5 w-5" />
                  <span className="text-[9px]">الفهرس</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="bottom" className="h-[70vh] bg-card border-border">
                <div className="mb-4">
                  <h2 className="text-lg font-bold text-center text-foreground">الصفحات</h2>
                </div>
                <div className="overflow-y-auto h-full pb-20">
                  <div className="grid grid-cols-5 gap-2">
                    {Array.from({ length: numPages }, (_, i) => {
                      const pageNum = i + 1;
                      const hasBookmark = annotations.some(a => a.page_number === pageNum && a.annotation_type === 'bookmark');
                      
                      return (
                        <button
                          key={i}
                          onClick={() => handleGoToPage(pageNum)}
                          className={`p-2 rounded-xl text-center transition-colors ${
                            currentPage === pageNum 
                              ? 'bg-primary text-primary-foreground' 
                              : 'bg-muted text-foreground hover:bg-muted/80'
                          }`}
                        >
                          <span className="text-sm font-bold">{pageNum}</span>
                          {hasBookmark && <BookmarkCheck className="w-3 h-3 mx-auto mt-0.5" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </SheetContent>
            </Sheet>
            
            {/* Go to Page */}
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="min-w-[52px] min-h-[52px] flex flex-col gap-0.5 text-foreground hover:bg-muted rounded-xl"
                >
                  <Hash className="h-5 w-5" />
                  <span className="text-[9px]">انتقال</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-48 p-3" align="center">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-foreground text-center">الانتقال لصفحة</p>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      min={1}
                      max={numPages}
                      value={goToPageInput}
                      onChange={(e) => setGoToPageInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleGoToPageSubmit()}
                      placeholder={`1-${numPages}`}
                      className="h-10 text-center"
                    />
                    <Button size="sm" onClick={handleGoToPageSubmit} className="h-10">
                      انتقال
                    </Button>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
            
            {/* Annotations - Only when online AND authenticated */}
            {isAuthenticated && isOnline && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowAnnotations(true)}
                className="min-w-[52px] min-h-[52px] flex flex-col gap-0.5 text-foreground hover:bg-muted rounded-xl relative"
              >
                <MessageSquare className="h-5 w-5" />
                <span className="text-[9px]">الملاحظات</span>
                {annotations.length > 0 && (
                  <span className="absolute top-1 right-1 w-4 h-4 bg-primary text-primary-foreground text-[8px] rounded-full flex items-center justify-center">
                    {annotations.length}
                  </span>
                )}
              </Button>
            )}
            
            {/* Quick Note - Only when online */}
            {isAuthenticated && isOnline && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowQuickNote(true)}
                className="min-w-[52px] min-h-[52px] flex flex-col gap-0.5 text-foreground hover:bg-muted rounded-xl"
              >
                <PenLine className="h-5 w-5" />
                <span className="text-[9px]">ملاحظة</span>
              </Button>
            )}
            
            {/* Reading Mode Toggle */}
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleReadingMode}
              className="min-w-[52px] min-h-[52px] flex flex-col gap-0.5 text-foreground hover:bg-muted rounded-xl"
            >
              {readingMode === 'vertical' ? (
                <Columns2 className="h-5 w-5" />
              ) : (
                <Rows3 className="h-5 w-5" />
              )}
              <span className="text-[9px]">{readingMode === 'vertical' ? 'أفقي' : 'عمودي'}</span>
            </Button>
          </div>
          
          {/* Action Buttons - Row 2 */}
          <div className="px-2 pb-4 pt-1 flex items-center justify-around">
            {/* Rotate */}
            <Button
              variant="ghost"
              size="icon"
              onClick={rotatePage}
              className="min-w-[52px] min-h-[52px] flex flex-col gap-0.5 text-foreground hover:bg-muted rounded-xl"
            >
              <RotateCw className="h-5 w-5" />
              <span className="text-[9px]">تدوير</span>
            </Button>
            
            {/* Zoom Out */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onScaleChange(Math.max(scale - 0.25, 0.5))}
              disabled={scale <= 0.5}
              className="min-w-[52px] min-h-[52px] flex flex-col gap-0.5 text-foreground hover:bg-muted rounded-xl disabled:opacity-30"
            >
              <ZoomOut className="h-5 w-5" />
              <span className="text-[9px]">تصغير</span>
            </Button>
            
            {/* Zoom Indicator */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onScaleChange(1)}
              className="min-w-[52px] min-h-[52px] flex flex-col gap-0.5 text-foreground hover:bg-muted rounded-xl"
            >
              <span className="text-base font-bold">{Math.round(scale * 100)}%</span>
              <span className="text-[9px]">إعادة</span>
            </Button>
            
            {/* Zoom In */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onScaleChange(Math.min(scale + 0.25, 3))}
              disabled={scale >= 3}
              className="min-w-[52px] min-h-[52px] flex flex-col gap-0.5 text-foreground hover:bg-muted rounded-xl disabled:opacity-30"
            >
              <ZoomIn className="h-5 w-5" />
              <span className="text-[9px]">تكبير</span>
            </Button>
            
            {/* Download - Only when online */}
            {isOnline && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onDownload}
                className="min-w-[52px] min-h-[52px] flex flex-col gap-0.5 text-foreground hover:bg-muted rounded-xl"
              >
                <Download className="h-5 w-5" />
                <span className="text-[9px]">تحميل</span>
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MobileReader;
