import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Document, Page, pdfjs } from 'react-pdf';
import { supabase } from '@/integrations/supabase/client';
import { useBookById } from '@/hooks/useBooks';
import { useAuth } from '@/hooks/useAuth';
import { 
  useBookAnnotations, 
  useAddAnnotation,
  useDeleteAnnotation,
  useReadingProgress, 
  useUpdateReadingProgress 
} from '@/hooks/useBookAnnotations';
import { useRealtimeAnnotations, useRealtimeReadingProgress } from '@/hooks/useRealtime';
import { useOfflineBooks, getOfflineBook, isBookSavedOffline } from '@/hooks/useOfflineBooks';
import { useOnlineStatus } from '@/hooks/useOfflineStorage';
import { useOfflineSync, useOfflineReadingProgress } from '@/hooks/useOfflineSync';
import { useIsMobile } from '@/hooks/use-mobile';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { toast } from 'sonner';
import { 
  ArrowRight, 
  ZoomIn, 
  ZoomOut, 
  Maximize, 
  Minimize,
  Download,
  ChevronRight,
  ChevronLeft,
  RotateCcw,
  BookOpen,
  Columns2,
  Rows3,
  Loader2,
  Home,
  List,
  Bookmark,
  BookmarkCheck,
  MessageSquare,
  PenLine,
  WifiOff,
  Sun,
  Moon,
  RotateCw,
  Settings,
  Hash,
  X,
  FileText
} from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import AnnotationPanel from '@/components/reader/AnnotationPanel';
import QuickNoteModal from '@/components/reader/QuickNoteModal';
import BookmarksButton from '@/components/reader/BookmarksButton';
import MobileReader from '@/components/reader/MobileReader';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Set up PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

// PDF.js options for better Arabic text support
const pdfOptions = {
  cMapUrl: `//unpkg.com/pdfjs-dist@${pdfjs.version}/cmaps/`,
  cMapPacked: true,
  standardFontDataUrl: `//unpkg.com/pdfjs-dist@${pdfjs.version}/standard_fonts/`,
  // Enable better text extraction for RTL languages
  disableFontFace: false,
  // Use enhanced text layer rendering
  useSystemFonts: true,
};

// Helper function to normalize Arabic text for better search
const normalizeArabicText = (text: string): string => {
  return text
    // Remove Arabic diacritics (تشكيل)
    .replace(/[\u064B-\u0652\u0670]/g, '')
    // Normalize Alef variations
    .replace(/[\u0622\u0623\u0625\u0627]/g, '\u0627')
    // Normalize Yeh variations
    .replace(/[\u0649\u064A]/g, '\u064A')
    // Normalize Heh variations
    .replace(/[\u0629]/g, '\u0647')
    // Remove extra whitespace
    .replace(/\s+/g, ' ')
    .trim();
};

// Number of pages to preload around current page
const PRELOAD_PAGES = 3;

const ReadBook = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isOnline = useOnlineStatus();
  const isMobile = useIsMobile();
  const { data: book, isLoading } = useBookById(id || '');
  const { data: annotations = [] } = useBookAnnotations(id || '');
  const { data: readingProgress } = useReadingProgress(id || '');
  const updateProgress = useUpdateReadingProgress();
  const addAnnotation = useAddAnnotation();
  const deleteAnnotation = useDeleteAnnotation();
  const { isBookSaved } = useOfflineBooks();
  const { syncAll, pendingCount } = useOfflineSync();
  const { updateProgressOffline } = useOfflineReadingProgress(id || '', user?.id);
  
  // Offline book state
  const [offlineFileUrl, setOfflineFileUrl] = useState<string | null>(null);
  const [isLoadingOffline, setIsLoadingOffline] = useState(false);
  const [isOfflineMode, setIsOfflineMode] = useState(false);
  
  // Enable realtime sync for annotations and reading progress
  useRealtimeAnnotations(id || '');
  useRealtimeReadingProgress(id || '');
  
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1.0);
  const [rotation, setRotation] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [showThumbnails, setShowThumbnails] = useState(false);
  const [showAnnotations, setShowAnnotations] = useState(false);
  const [showQuickNote, setShowQuickNote] = useState(false);
  const [pdfError, setPdfError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isAnnotationMode, setIsAnnotationMode] = useState(false);
  const [goToPageInput, setGoToPageInput] = useState('');
  const [showBookmarks, setShowBookmarks] = useState(false);
  const [dualPageMode, setDualPageMode] = useState(false);
  const [useNativePdfViewer, setUseNativePdfViewer] = useState(false);
  const [desktopReadingMode, setDesktopReadingMode] = useState<'horizontal' | 'vertical'>(() => {
    const saved = localStorage.getItem('desktop-reading-mode');
    return (saved as 'horizontal' | 'vertical') || 'horizontal';
  });
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<(HTMLDivElement | null)[]>([]);
  
  const { resolvedTheme, setTheme, isDark } = useTheme();
  
  const containerRef = useRef<HTMLDivElement>(null);
  const [loadedPages, setLoadedPages] = useState<Set<number>>(new Set());

  // Track if we've already loaded offline book to prevent duplicate toasts
  const offlineLoadAttemptedRef = useRef(false);

  // Load offline book if not online or book not available
  useEffect(() => {
    // Only run once per book ID
    if (offlineLoadAttemptedRef.current) return;
    
    const loadOfflineBook = async () => {
      if (!id) return;
      
      // Mark as attempted immediately to prevent re-runs
      offlineLoadAttemptedRef.current = true;
      
      // Always check async if book is saved offline
      const bookIsSavedAsync = await isBookSavedOffline(id);
      
      console.log('Checking offline book:', { id, isOnline, bookIsSavedAsync });
      
      if (!bookIsSavedAsync) {
        if (!isOnline) {
          console.log('Book not saved offline and we are offline');
        }
        return;
      }
      
      // Load from offline storage
      setIsLoadingOffline(true);
      try {
        const savedBook = await getOfflineBook(id);
        console.log('Got offline book:', savedBook ? 'Found' : 'Not found', savedBook?.fileBlob ? 'Has blob' : 'No blob');
        
        if (savedBook?.fileBlob) {
          const url = URL.createObjectURL(savedBook.fileBlob);
          setOfflineFileUrl(url);
          setIsOfflineMode(true);
          console.log('Created offline URL:', url);
          if (!isOnline) {
            toast.success('تم تحميل الكتاب من الذاكرة المحلية', { id: 'offline-load', duration: 2000 });
          }
        } else {
          console.warn('Offline book found but no file blob');
          if (!isOnline) {
            toast.error('الكتاب محفوظ لكن الملف غير موجود', { id: 'offline-error' });
          }
        }
      } catch (error) {
        console.error('Failed to load offline book:', error);
        if (!isOnline) {
          toast.error('فشل في تحميل الكتاب من الذاكرة المحلية', { id: 'offline-error' });
        }
      } finally {
        setIsLoadingOffline(false);
      }
    };

    loadOfflineBook();
  }, [id, isOnline]);

  // Reset ref when book ID changes
  useEffect(() => {
    offlineLoadAttemptedRef.current = false;
  }, [id]);

  // Cleanup URL on unmount
  useEffect(() => {
    return () => {
      if (offlineFileUrl) {
        URL.revokeObjectURL(offlineFileUrl);
      }
    };
  }, [offlineFileUrl]);

  // Determine which file URL to use
  const pdfFileUrl = useMemo(() => {
    if (offlineFileUrl) return offlineFileUrl;
    return book?.file_url || null;
  }, [offlineFileUrl, book?.file_url]);

  // Check if current page is bookmarked
  const isCurrentPageBookmarked = annotations.some(
    a => a.page_number === pageNumber && a.annotation_type === 'bookmark'
  );

  // Calculate pages to preload around current page
  const pagesToRender = useMemo(() => {
    if (numPages === 0) return [];
    
    const pages: number[] = [];
    const start = Math.max(1, pageNumber - PRELOAD_PAGES);
    const end = Math.min(numPages, pageNumber + PRELOAD_PAGES);
    
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  }, [pageNumber, numPages]);

  // Track loaded pages
  const handlePageLoadSuccess = useCallback((page: number) => {
    setLoadedPages(prev => new Set([...prev, page]));
  }, []);

  // Restore reading progress on load
  useEffect(() => {
    if (readingProgress?.current_page && readingProgress.current_page > 1) {
      setPageNumber(readingProgress.current_page);
    }
  }, [readingProgress]);

  // Increment view count when book is opened
  useEffect(() => {
    const incrementView = async () => {
      if (id) {
        try {
          // Update view count directly
          const { error } = await supabase
            .from('books')
            .update({ view_count: (book?.view_count || 0) + 1 })
            .eq('id', id);
          if (error) console.error('Error incrementing view count:', error);
        } catch (error) {
          console.error('Error incrementing view count:', error);
        }
      }
    };
    incrementView();
  }, [id]);

  // Refs for saving progress on unmount (to avoid stale closures)
  const pageNumberRef = useRef(pageNumber);
  const numPagesRef = useRef(numPages);
  
  useEffect(() => {
    pageNumberRef.current = pageNumber;
    numPagesRef.current = numPages;
  }, [pageNumber, numPages]);

  // Save reading progress periodically (with offline support)
  useEffect(() => {
    if (id && user && numPages > 0) {
      const saveProgress = () => {
        if (isOnline) {
          updateProgress.mutate({ bookId: id, currentPage: pageNumber, totalPages: numPages });
        } else {
          updateProgressOffline(pageNumber, numPages);
        }
      };
      
      const timeout = setTimeout(saveProgress, 2000);
      return () => clearTimeout(timeout);
    }
  }, [pageNumber, numPages, id, user, isOnline, updateProgressOffline]);

  // Auto-save on page unload/exit
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (id && user && numPagesRef.current > 0 && pageNumberRef.current > 0) {
        const progressData = {
          book_id: id,
          user_id: user.id,
          current_page: pageNumberRef.current,
          total_pages: numPagesRef.current,
          last_read_at: new Date().toISOString()
        };
        
        try {
          const key = `reading_progress_${id}`;
          localStorage.setItem(key, JSON.stringify(progressData));
        } catch (e) {
          console.error('Failed to save progress to localStorage:', e);
        }
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('pagehide', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('pagehide', handleBeforeUnload);
      // Save progress when component unmounts
      if (id && user && numPagesRef.current > 0 && pageNumberRef.current > 0 && isOnline) {
        updateProgress.mutate({ 
          bookId: id, 
          currentPage: pageNumberRef.current, 
          totalPages: numPagesRef.current 
        });
      }
    };
  }, [id, user, isOnline]);

  // Auto-hide controls after inactivity
  useEffect(() => {
    let timeout: NodeJS.Timeout;
    const resetTimeout = () => {
      setShowControls(true);
      clearTimeout(timeout);
      timeout = setTimeout(() => setShowControls(false), 3000);
    };

    window.addEventListener('mousemove', resetTimeout);
    window.addEventListener('touchstart', resetTimeout);
    resetTimeout();

    return () => {
      clearTimeout(timeout);
      window.removeEventListener('mousemove', resetTimeout);
      window.removeEventListener('touchstart', resetTimeout);
    };
  }, []);

  // Toggle controls on click - toggle visibility
  const handleContainerClick = useCallback((e: React.MouseEvent) => {
    // Don't toggle if clicking on buttons or interactive elements
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('a') || target.closest('input') || target.closest('[role="slider"]')) {
      return;
    }
    // Toggle controls visibility
    setShowControls(prev => !prev);
  }, []);

  // Toggle annotation mode
  const toggleAnnotationMode = useCallback(() => {
    if (!user) {
      toast.error('يجب تسجيل الدخول لاستخدام أدوات الملاحظات');
      return;
    }
    setIsAnnotationMode(prev => !prev);
  }, [user]);

  const closeAnnotationToolbar = useCallback(() => {
    setIsAnnotationMode(false);
  }, []);

  // Rotate page
  const rotatePage = useCallback(() => {
    setRotation(prev => (prev + 90) % 360);
  }, []);

  // Toggle theme
  const toggleTheme = useCallback(() => {
    setTheme(isDark ? 'light' : 'dark');
  }, [isDark, setTheme]);

  // Toggle reading mode
  const toggleDesktopReadingMode = useCallback(() => {
    setDesktopReadingMode(prev => {
      const newMode = prev === 'horizontal' ? 'vertical' : 'horizontal';
      localStorage.setItem('desktop-reading-mode', newMode);
      return newMode;
    });
  }, []);

  // Scroll to page in vertical mode
  const scrollToPage = useCallback((page: number) => {
    if (desktopReadingMode !== 'vertical') return;
    const pageRef = pageRefs.current[page - 1];
    if (pageRef && scrollContainerRef.current) {
      pageRef.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [desktopReadingMode]);

  // Update current page based on scroll position (vertical mode)
  useEffect(() => {
    if (desktopReadingMode !== 'vertical') return;
    
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
      
      if (mostVisiblePage !== pageNumber) {
        setPageNumber(mostVisiblePage);
      }
    };
    
    scrollContainer.addEventListener('scroll', handleScroll, { passive: true });
    return () => scrollContainer.removeEventListener('scroll', handleScroll);
  }, [numPages, pageNumber, desktopReadingMode]);

  // Go to specific page
  const handleGoToPage = useCallback(() => {
    const page = parseInt(goToPageInput);
    if (page >= 1 && page <= numPages) {
      setPageNumber(page);
      setGoToPageInput('');
    } else {
      toast.error(`الرجاء إدخال رقم صفحة بين 1 و ${numPages}`);
    }
  }, [goToPageInput, numPages]);

  // Get bookmarks only
  const bookmarks = useMemo(() => {
    return annotations.filter(a => a.annotation_type === 'bookmark');
  }, [annotations]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      
      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          // يسار = الصفحة السابقة
          setPageNumber(prev => Math.max(prev - (dualPageMode ? 2 : 1), 1));
          break;
        case 'ArrowRight':
          e.preventDefault();
          // يمين = الصفحة التالية
          setPageNumber(prev => Math.min(prev + (dualPageMode ? 2 : 1), numPages));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setPageNumber(prev => Math.max(prev - (dualPageMode ? 2 : 1), 1));
          break;
        case 'ArrowDown':
          e.preventDefault();
          setPageNumber(prev => Math.min(prev + (dualPageMode ? 2 : 1), numPages));
          break;
        case '+':
        case '=':
          zoomIn();
          break;
        case '-':
          zoomOut();
          break;
        case 'Escape':
          if (isFullscreen) toggleFullscreen();
          setIsAnnotationMode(false);
          break;
        case 'f':
          toggleFullscreen();
          break;
        case 'b':
          toggleBookmark();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pageNumber, numPages, isFullscreen]);

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setLoading(false);
    setPdfError(false);
  };

  const onDocumentLoadError = (error: any) => {
    console.error('PDF load error:', error);
    setPdfError(true);
    setLoading(false);
    toast.error('فشل في تحميل الكتاب');
  };

  const goToNextPage = useCallback(() => {
    const step = dualPageMode ? 2 : 1;
    setPageNumber(prev => Math.min(prev + step, numPages));
  }, [numPages, dualPageMode]);

  const goToPrevPage = useCallback(() => {
    const step = dualPageMode ? 2 : 1;
    setPageNumber(prev => Math.max(prev - step, 1));
  }, [dualPageMode]);

  const goToPage = (page: number) => {
    setPageNumber(Math.min(Math.max(page, 1), numPages));
  };

  const zoomIn = () => setScale(prev => Math.min(prev + 0.25, 3));
  const zoomOut = () => setScale(prev => Math.max(prev - 0.25, 0.5));
  const resetZoom = () => setScale(1);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const toggleBookmark = async () => {
    if (!user || !id) {
      toast.error('يجب تسجيل الدخول لإضافة إشارة مرجعية');
      return;
    }

    try {
      if (isCurrentPageBookmarked) {
        // Remove bookmark
        const bookmark = annotations.find(
          a => a.page_number === pageNumber && a.annotation_type === 'bookmark'
        );
        if (bookmark) {
          await deleteAnnotation.mutateAsync({ id: bookmark.id, bookId: id });
          toast.success('تم إزالة الإشارة المرجعية');
        }
      } else {
        // Add bookmark
        await addAnnotation.mutateAsync({
          book_id: id,
          page_number: pageNumber,
          annotation_type: 'bookmark',
        });
        toast.success('تمت إضافة إشارة مرجعية');
      }
    } catch (error) {
      toast.error('حدث خطأ');
    }
  };

  const handleDownload = async () => {
    if (!book?.file_url || !id) return;

    try {
      await supabase.rpc('increment_download_count', { book_id: id });
      
      toast.loading('جاري تحميل الكتاب...', { id: 'download' });
      
      const response = await fetch(book.file_url);
      if (!response.ok) throw new Error('فشل في تحميل الملف');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${book.title}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.success('تم تحميل الكتاب بنجاح', { id: 'download' });
    } catch (error) {
      console.error('Download error:', error);
      toast.error('حدث خطأ أثناء التحميل', { id: 'download' });
    }
  };

  if (isLoading || isLoadingOffline) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">
            {isLoadingOffline ? 'جاري تحميل الكتاب من الذاكرة المحلية...' : 'جاري التحميل...'}
          </p>
        </div>
      </div>
    );
  }

  // Show error only if we don't have any file URL (online or offline)
  if (!pdfFileUrl) {
    // Check if book is saved offline
    const bookSavedOffline = id ? isBookSaved(id) : false;
    
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <BookOpen className="w-16 h-16 text-muted-foreground" />
        <h1 className="text-xl font-bold">الكتاب غير متوفر للقراءة</h1>
        {!isOnline && bookSavedOffline && (
          <p className="text-muted-foreground">جاري تحميل الكتاب من الذاكرة المحلية...</p>
        )}
        {!isOnline && !bookSavedOffline && (
          <p className="text-muted-foreground">أنت غير متصل بالإنترنت والكتاب غير محفوظ محلياً</p>
        )}
        <Link to={`/book/${id}`}>
          <Button>العودة لتفاصيل الكتاب</Button>
        </Link>
      </div>
    );
  }

  // Calculate sidebar width
  const sidebarWidth = showAnnotations ? 320 : (showThumbnails ? 192 : 0);

  // Mobile Reader View
  if (isMobile) {
    return (
      <MobileReader
        pdfUrl={pdfFileUrl}
        bookTitle={book?.title || 'كتاب محفوظ'}
        bookAuthor={book?.author}
        bookId={id || ''}
        numPages={numPages}
        currentPage={pageNumber}
        scale={scale}
        annotations={annotations}
        isAuthenticated={!!user}
        onPageChange={setPageNumber}
        onScaleChange={setScale}
        onDocumentLoad={onDocumentLoadSuccess}
        onDocumentError={onDocumentLoadError}
        onDownload={handleDownload}
        onNavigateBack={() => navigate(`/book/${id}`)}
        onNavigateHome={() => navigate('/')}
        onGoToPage={goToPage}
      />
    );
  }

  // Desktop Reader View
  return (
    <div className="min-h-screen bg-background flex flex-col relative overflow-hidden" onClick={handleContainerClick}>
      {/* Subtle background pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" style={{ 
          backgroundImage: `radial-gradient(circle at 25px 25px, hsl(var(--foreground) / 0.15) 2px, transparent 0)`,
          backgroundSize: '50px 50px'
        }} />
      </div>
      
      {/* Offline Mode Indicator */}
      {isOfflineMode && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[60] bg-amber-500/90 backdrop-blur-sm text-amber-950 px-5 py-2.5 rounded-full flex items-center gap-2 shadow-lg shadow-amber-500/20 border border-amber-400/30">
          <WifiOff className="w-4 h-4" />
          <span className="text-sm font-medium">وضع القراءة بدون إنترنت</span>
        </div>
      )}
      
      {/* Top Bar */}
      <div 
        className={`fixed top-0 left-0 right-0 z-50 bg-gradient-to-b from-background/95 via-background/70 to-transparent backdrop-blur-sm p-4 transition-all duration-300 ${
          showControls ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4 pointer-events-none'
        }`}
      >
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(`/book/${id}`)}
              className="text-foreground/90 hover:text-foreground hover:bg-foreground/10 rounded-xl transition-colors"
            >
              <ArrowRight className="h-5 w-5" />
            </Button>
            <div className="text-foreground">
              <h1 className="font-bold text-sm md:text-base line-clamp-1">{book?.title || 'كتاب محفوظ'}</h1>
              <p className="text-xs text-muted-foreground">{book?.author || ''}</p>
            </div>
          </div>

          <div className="flex items-center gap-1 bg-muted/50 backdrop-blur-sm rounded-2xl p-1.5 border border-border/50">
            {/* Bookmarks - Only when online AND logged in */}
            {user && isOnline && id && (
              <BookmarksButton 
                bookId={id} 
                currentPage={pageNumber} 
                onGoToPage={(page) => setPageNumber(page)}
              />
            )}
            
            {/* Quick note button - Only when online AND logged in */}
            {user && isOnline && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowQuickNote(true)}
                className="text-foreground/80 hover:text-foreground hover:bg-foreground/10 rounded-xl h-9 w-9"
                title="إضافة ملاحظة سريعة"
              >
                <PenLine className="h-4 w-4" />
              </Button>
            )}
            
            {user && isOnline && <div className="w-px h-5 bg-border mx-1" />}
            
            {/* Annotations panel toggle - Only when online AND logged in */}
            {user && isOnline && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setShowAnnotations(!showAnnotations);
                  setShowThumbnails(false);
                }}
                className={`text-foreground/80 hover:text-foreground hover:bg-foreground/10 rounded-xl h-9 w-9 ${showAnnotations ? 'bg-foreground/15' : ''}`}
                title="الملاحظات"
              >
                <MessageSquare className="h-4 w-4" />
              </Button>
            )}
            
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                setShowThumbnails(!showThumbnails);
                setShowAnnotations(false);
              }}
              className={`text-foreground/80 hover:text-foreground hover:bg-foreground/10 rounded-xl h-9 w-9 ${showThumbnails ? 'bg-foreground/15' : ''}`}
            >
              <List className="h-4 w-4" />
            </Button>
            
            <div className="w-px h-5 bg-border mx-1" />

            {/* Go to page */}
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-foreground/80 hover:text-foreground hover:bg-foreground/10 rounded-xl h-9 w-9"
                  title="الانتقال لصفحة"
                >
                  <Hash className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-48 p-3" align="center">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-foreground">الانتقال لصفحة</p>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      min={1}
                      max={numPages}
                      value={goToPageInput}
                      onChange={(e) => setGoToPageInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleGoToPage()}
                      placeholder={`1-${numPages}`}
                      className="h-9 text-center"
                    />
                    <Button size="sm" onClick={handleGoToPage} className="h-9">
                      انتقال
                    </Button>
                  </div>
                </div>
              </PopoverContent>
            </Popover>

            {/* Bookmarks list - Only when online AND logged in */}
            {user && isOnline && bookmarks.length > 0 && (
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-foreground/80 hover:text-foreground hover:bg-foreground/10 rounded-xl h-9 w-9 relative"
                    title="الإشارات المرجعية"
                  >
                    <BookmarkCheck className="h-4 w-4" />
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-primary text-primary-foreground text-[10px] rounded-full flex items-center justify-center">
                      {bookmarks.length}
                    </span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-56 p-2" align="center">
                  <p className="text-sm font-medium text-foreground px-2 py-1.5 border-b border-border mb-1">الإشارات المرجعية</p>
                  <div className="max-h-48 overflow-y-auto space-y-1">
                    {bookmarks.map((bookmark) => (
                      <button
                        key={bookmark.id}
                        onClick={() => setPageNumber(bookmark.page_number)}
                        className={`w-full text-right px-3 py-2 rounded-lg text-sm transition-colors ${
                          pageNumber === bookmark.page_number
                            ? 'bg-primary/20 text-primary'
                            : 'hover:bg-muted text-foreground'
                        }`}
                      >
                        صفحة {bookmark.page_number}
                      </button>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            )}
            
            <div className="w-px h-5 bg-border mx-1" />

            {/* Rotate page */}
            <Button
              variant="ghost"
              size="icon"
              onClick={rotatePage}
              className="text-foreground/80 hover:text-foreground hover:bg-foreground/10 rounded-xl h-9 w-9"
              title="تدوير الصفحة"
            >
              <RotateCw className="h-4 w-4" />
            </Button>

            {/* Reading mode toggle */}
            {!isMobile && (
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleDesktopReadingMode}
                className={`text-foreground/80 hover:text-foreground hover:bg-foreground/10 rounded-xl h-9 w-9`}
                title={desktopReadingMode === 'vertical' ? 'وضع أفقي' : 'وضع عمودي'}
              >
                {desktopReadingMode === 'vertical' ? <Columns2 className="h-4 w-4" /> : <Rows3 className="h-4 w-4" />}
              </Button>
            )}

            {/* Dual page mode - only for large screens and horizontal mode */}
            {!isMobile && desktopReadingMode === 'horizontal' && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setDualPageMode(!dualPageMode)}
                className={`text-foreground/80 hover:text-foreground hover:bg-foreground/10 rounded-xl h-9 w-9 ${dualPageMode ? 'bg-primary/20 text-primary' : ''}`}
                title={dualPageMode ? 'صفحة واحدة' : 'صفحتين'}
              >
                <Columns2 className="h-4 w-4" />
              </Button>
            )}


            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              className="text-foreground/80 hover:text-foreground hover:bg-foreground/10 rounded-xl h-9 w-9"
              title={isDark ? 'الوضع النهاري' : 'الوضع الليلي'}
            >
              {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            
            <div className="w-px h-5 bg-border mx-1" />
            
            {/* Download button - Only when online */}
            {isOnline && (
              <Button
                variant="ghost"
                size="icon"
                onClick={handleDownload}
                className="text-foreground/80 hover:text-foreground hover:bg-foreground/10 rounded-xl h-9 w-9"
              >
                <Download className="h-4 w-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleFullscreen}
              className="text-foreground/80 hover:text-foreground hover:bg-foreground/10 rounded-xl h-9 w-9"
            >
              {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/')}
              className="text-foreground/80 hover:text-foreground hover:bg-foreground/10 rounded-xl h-9 w-9"
            >
              <Home className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Annotations Sidebar - Only when online */}
      {showAnnotations && user && isOnline && (
        <div className="absolute top-0 right-0 h-full w-80 z-40 pt-16 pb-32">
          <AnnotationPanel
            annotations={annotations}
            bookId={id || ''}
            currentPage={pageNumber}
            onClose={() => setShowAnnotations(false)}
            onGoToPage={goToPage}
          />
        </div>
      )}

      {/* Thumbnails Sidebar */}
      {showThumbnails && (
        <div className="absolute top-0 right-0 h-full w-52 bg-card/95 backdrop-blur-xl border-l border-border z-40 overflow-y-auto pt-20 pb-24">
          <div className="p-3 space-y-1.5">
            <div className="px-2 py-2 mb-3">
              <h3 className="text-muted-foreground text-xs font-medium">الصفحات</h3>
            </div>
            {Array.from({ length: numPages }, (_, i) => {
              const pageNum = i + 1;
              const hasBookmark = annotations.some(a => a.page_number === pageNum && a.annotation_type === 'bookmark');
              const hasNotes = annotations.some(a => a.page_number === pageNum && (a.annotation_type === 'note' || a.annotation_type === 'highlight'));
              
              return (
                <button
                  key={i}
                  onClick={() => setPageNumber(pageNum)}
                  className={`w-full p-3 rounded-xl transition-all flex items-center justify-between group ${
                    pageNumber === pageNum 
                      ? 'bg-primary/20 text-primary border border-primary/30' 
                      : 'hover:bg-muted text-muted-foreground hover:text-foreground border border-transparent'
                  }`}
                >
                  <span className="text-sm">صفحة {pageNum}</span>
                  <div className="flex items-center gap-1.5">
                    {hasBookmark && <BookmarkCheck className="w-3.5 h-3.5 text-primary" />}
                    {hasNotes && <MessageSquare className="w-3.5 h-3.5 text-secondary" />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* PDF Viewer Container */}
      {desktopReadingMode === 'vertical' ? (
        // Vertical Scroll Mode
        <div 
          ref={scrollContainerRef}
          className={`flex-1 overflow-y-auto overflow-x-hidden py-20 scrollbar-hide ${
            isAnnotationMode ? 'cursor-text select-text' : ''
          }`}
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          onClick={handleContainerClick}
        >
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-background z-10">
              <div className="text-center">
                <div className="w-16 h-16 rounded-2xl bg-primary/20 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-primary/10">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
                <p className="text-muted-foreground">جاري تحميل الكتاب...</p>
              </div>
            </div>
          )}

          {pdfError ? (
            <div className="flex justify-center">
              <div className="text-center bg-card/60 backdrop-blur-sm rounded-2xl p-8 border border-border">
                <div className="w-16 h-16 rounded-2xl bg-destructive/20 flex items-center justify-center mx-auto mb-4">
                  <BookOpen className="w-8 h-8 text-destructive" />
                </div>
                <p className="text-muted-foreground mb-4">فشل في تحميل الكتاب</p>
                <Button onClick={() => window.location.reload()} className="rounded-xl">
                  إعادة المحاولة
                </Button>
              </div>
            </div>
          ) : (
            <Document
              file={pdfFileUrl}
              onLoadSuccess={onDocumentLoadSuccess}
              onLoadError={onDocumentLoadError}
              loading={null}
              className="flex flex-col items-center"
              options={pdfOptions}
            >
              {Array.from({ length: numPages }, (_, index) => (
                <div
                  key={index}
                  ref={(el) => { pageRefs.current[index] = el; }}
                  className="mb-4"
                >
                  <Page
                    pageNumber={index + 1}
                    scale={scale}
                    rotate={rotation}
                    className="shadow-2xl shadow-foreground/20 rounded-lg overflow-hidden"
                    renderTextLayer={true}
                    renderAnnotationLayer={true}
                    onLoadSuccess={() => handlePageLoadSuccess(index + 1)}
                    loading={
                      <div 
                        className="flex items-center justify-center bg-muted rounded-lg border border-border" 
                        style={{ width: 600 * scale, height: 800 * scale }}
                      >
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      </div>
                    }
                  />
                </div>
              ))}
            </Document>
          )}
        </div>
      ) : (
        // Horizontal Mode
        <div 
          ref={containerRef}
          className={`flex-1 flex items-center justify-center overflow-auto py-20 scrollbar-hide ${
            isAnnotationMode ? 'cursor-text select-text' : ''
          }`}
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-background">
              <div className="text-center">
                <div className="w-16 h-16 rounded-2xl bg-primary/20 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-primary/10">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
                <p className="text-muted-foreground">جاري تحميل الكتاب...</p>
              </div>
            </div>
          )}

          {pdfError ? (
            <div className="text-center bg-card/60 backdrop-blur-sm rounded-2xl p-8 border border-border">
              <div className="w-16 h-16 rounded-2xl bg-destructive/20 flex items-center justify-center mx-auto mb-4">
                <BookOpen className="w-8 h-8 text-destructive" />
              </div>
              <p className="text-muted-foreground mb-4">فشل في تحميل الكتاب</p>
              <Button onClick={() => window.location.reload()} className="rounded-xl">
                إعادة المحاولة
              </Button>
            </div>
          ) : useNativePdfViewer ? (
            <div className="w-full h-full flex items-center justify-center">
              <iframe
                src={`${pdfFileUrl}#page=${pageNumber}`}
                className="w-full h-full min-h-[calc(100vh-200px)] rounded-lg shadow-2xl border border-border"
                title={book?.title || 'PDF Viewer'}
                style={{ minWidth: '80vw', minHeight: '80vh' }}
              />
            </div>
          ) : (
            <div className="relative">
              <div className="absolute -inset-4 bg-gradient-to-b from-foreground/5 via-transparent to-foreground/5 rounded-2xl pointer-events-none" />
              
              <Document
                file={pdfFileUrl}
                onLoadSuccess={onDocumentLoadSuccess}
                onLoadError={onDocumentLoadError}
                loading={null}
                className={`flex justify-center relative ${dualPageMode ? 'gap-4' : ''}`}
                options={pdfOptions}
              >
                {dualPageMode ? (
                  <div className="flex gap-4 items-start">
                    <Page
                      pageNumber={pageNumber}
                      scale={scale * 0.7}
                      rotate={rotation}
                      className="shadow-2xl shadow-foreground/20 rounded-lg overflow-hidden"
                      renderTextLayer={true}
                      renderAnnotationLayer={true}
                      onLoadSuccess={() => handlePageLoadSuccess(pageNumber)}
                      loading={
                        <div 
                          className="flex items-center justify-center bg-muted rounded-lg border border-border" 
                          style={{ width: 420 * scale, height: 560 * scale }}
                        >
                          <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                      }
                    />
                    {pageNumber < numPages && (
                      <Page
                        pageNumber={pageNumber + 1}
                        scale={scale * 0.7}
                        rotate={rotation}
                        className="shadow-2xl shadow-foreground/20 rounded-lg overflow-hidden"
                        renderTextLayer={true}
                        renderAnnotationLayer={true}
                        onLoadSuccess={() => handlePageLoadSuccess(pageNumber + 1)}
                        loading={
                          <div 
                            className="flex items-center justify-center bg-muted rounded-lg border border-border" 
                            style={{ width: 420 * scale, height: 560 * scale }}
                          >
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                          </div>
                        }
                      />
                    )}
                  </div>
                ) : (
                  <>
                    {pagesToRender.map((page) => (
                      <div
                        key={page}
                        className={`${page === pageNumber ? 'block' : 'absolute opacity-0 pointer-events-none'}`}
                        style={page !== pageNumber ? { left: '-9999px' } : undefined}
                      >
                        <Page
                          pageNumber={page}
                          scale={scale}
                          rotate={rotation}
                          className="shadow-2xl shadow-foreground/20 rounded-lg overflow-hidden"
                          renderTextLayer={page === pageNumber}
                          renderAnnotationLayer={page === pageNumber}
                          onLoadSuccess={() => handlePageLoadSuccess(page)}
                          loading={
                            <div 
                              className="flex items-center justify-center bg-muted rounded-lg border border-border" 
                              style={{ width: 600 * scale, height: 800 * scale }}
                            >
                              <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            </div>
                          }
                        />
                      </div>
                    ))}
                  </>
                )}
              </Document>
            </div>
          )}
        </div>
      )}

      {/* Quick Note Modal - Only when online */}
      {showQuickNote && user && isOnline && (
        <QuickNoteModal
          bookId={id || ''}
          pageNumber={pageNumber}
          onClose={() => setShowQuickNote(false)}
        />
      )}

      {/* Page Navigation (Side Buttons) - Hidden in horizontal mode */}

      {/* Bottom Controls */}
      <div 
        className={`fixed bottom-0 left-0 right-0 z-50 p-4 bg-gradient-to-t from-background/95 via-background/70 to-transparent backdrop-blur-sm transition-all duration-300 ${
          showControls ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
        }`}
        style={{ right: showAnnotations ? 320 : (showThumbnails ? 192 : 0) }}
      >
        <div className="max-w-3xl mx-auto space-y-4">
          {/* Page info */}
          <div className="flex items-center justify-center gap-3">
            <span className="text-sm font-medium text-foreground bg-muted/80 backdrop-blur-sm px-4 py-1.5 rounded-lg border border-border/50">
              {pageNumber} / {numPages}
            </span>
          </div>
          
          {/* Page Slider */}
          <div className="flex items-center gap-4 bg-muted/50 rounded-2xl p-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={goToPrevPage}
              disabled={pageNumber <= 1}
              className="text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl h-8 w-8"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Slider
              value={[pageNumber]}
              min={1}
              max={numPages || 1}
              step={1}
              onValueChange={([value]) => setPageNumber(value)}
              className="flex-1"
              dir="ltr"
            />
            <Button
              variant="ghost"
              size="icon"
              onClick={goToNextPage}
              disabled={pageNumber >= numPages}
              className="text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl h-8 w-8"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </div>

          {/* Zoom Controls */}
          <div className="flex items-center justify-center gap-1 bg-muted/50 rounded-2xl p-1.5 w-fit mx-auto">
            <Button
              variant="ghost"
              size="icon"
              onClick={zoomOut}
              disabled={scale <= 0.5}
              className="text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl h-8 w-8"
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={resetZoom}
              className="text-muted-foreground hover:text-foreground hover:bg-muted px-4 rounded-xl h-8 min-w-[60px]"
            >
              {Math.round(scale * 100)}%
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={zoomIn}
              disabled={scale >= 3}
              className="text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl h-8 w-8"
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
            <div className="w-px h-5 bg-border mx-1" />
            <Button
              variant="ghost"
              size="icon"
              onClick={resetZoom}
              className="text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl h-8 w-8"
              title="إعادة الحجم الأصلي"
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReadBook;
