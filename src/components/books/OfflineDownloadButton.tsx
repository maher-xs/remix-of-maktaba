import { useState, useEffect } from 'react';
import { Book } from '@/hooks/useBooks';
import { useOfflineDownload } from '@/hooks/useOfflineDownload';
import { useOfflineBooks } from '@/hooks/useOfflineBooks';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  Download, 
  Check, 
  X, 
  Loader2, 
  WifiOff,
  Trash2
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface OfflineDownloadButtonProps {
  book: Book;
  variant?: 'default' | 'compact' | 'icon';
  className?: string;
  onDownloadComplete?: () => void;
}

const OfflineDownloadButton = ({
  book,
  variant = 'default',
  className,
  onDownloadComplete,
}: OfflineDownloadButtonProps) => {
  const { downloadBook, cancelDownload, getDownloadProgress, isDownloading, formatSize } = useOfflineDownload();
  const { isBookSaved, removeBook, refreshBooks } = useOfflineBooks();
  const [isSaved, setIsSaved] = useState(false);

  const progress = getDownloadProgress(book.id);
  const downloading = isDownloading(book.id);

  useEffect(() => {
    setIsSaved(isBookSaved(book.id));
  }, [isBookSaved, book.id]);

  useEffect(() => {
    if (progress?.status === 'completed') {
      setIsSaved(true);
      refreshBooks();
      onDownloadComplete?.();
    }
  }, [progress?.status, refreshBooks, onDownloadComplete]);

  const handleDownload = async () => {
    if (downloading) {
      cancelDownload(book.id);
      return;
    }

    if (isSaved) {
      await removeBook(book.id);
      setIsSaved(false);
      return;
    }

    await downloadBook(book);
  };

  // Icon variant - matches other action buttons
  if (variant === 'icon') {
    return (
      <Button
        onClick={handleDownload}
        disabled={downloading && progress?.progress === 100}
        variant="outline"
        size="icon"
        className={cn(
          "h-9 w-9 rounded-lg border relative",
          isSaved && "text-primary border-primary bg-primary/10",
          downloading && "border-primary/50",
          className
        )}
        aria-label={isSaved ? "إزالة من المحفوظات" : downloading ? "جاري التحميل" : "تحميل للقراءة Offline"}
      >
        {downloading ? (
          <>
            <svg className="absolute inset-0 -rotate-90 p-0.5" viewBox="0 0 36 36">
              <circle
                cx="18"
                cy="18"
                r="15"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeDasharray={`${(progress?.progress || 0) * 0.94} 94`}
                className="text-primary"
              />
            </svg>
            <X className="w-4 h-4" />
          </>
        ) : isSaved ? (
          <Check className="w-4 h-4" />
        ) : (
          <Download className="w-4 h-4" />
        )}
      </Button>
    );
  }

  // Compact variant - smaller button
  if (variant === 'compact') {
    return (
      <Button
        onClick={handleDownload}
        variant={isSaved ? "outline" : "secondary"}
        size="sm"
        className={cn(
          "gap-1.5 rounded-lg",
          isSaved && "border-primary/30 text-primary",
          className
        )}
      >
        {downloading ? (
          <>
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span className="text-xs">{progress?.progress || 0}%</span>
          </>
        ) : isSaved ? (
          <>
            <WifiOff className="w-3.5 h-3.5" />
            <span>محفوظ</span>
          </>
        ) : (
          <>
            <Download className="w-3.5 h-3.5" />
            <span>Offline</span>
          </>
        )}
      </Button>
    );
  }

  // Default variant - full button with progress
  return (
    <div className={cn("space-y-2", className)}>
      <Button
        onClick={handleDownload}
        variant={isSaved ? "outline" : "default"}
        className={cn(
          "w-full gap-2 rounded-xl",
          isSaved && "border-primary/30 hover:border-destructive hover:text-destructive group"
        )}
        disabled={downloading && progress?.progress === 100}
      >
        {downloading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>جاري التحميل... {progress?.progress || 0}%</span>
            <X className="w-4 h-4 mr-auto" />
          </>
        ) : isSaved ? (
          <>
            <WifiOff className="w-4 h-4 group-hover:hidden" />
            <Trash2 className="w-4 h-4 hidden group-hover:block" />
            <span className="group-hover:hidden">محفوظ للقراءة Offline</span>
            <span className="hidden group-hover:block">إزالة من المحفوظات</span>
          </>
        ) : (
          <>
            <Download className="w-4 h-4" />
            <span>تحميل للقراءة بدون إنترنت</span>
          </>
        )}
      </Button>

      {/* Progress bar */}
      {downloading && (
        <div className="space-y-1">
          <Progress value={progress?.progress || 0} className="h-2" />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>
              {formatSize(progress?.downloadedSize || 0)} / {formatSize(progress?.totalSize || 0)}
            </span>
            <button
              onClick={() => cancelDownload(book.id)}
              className="text-destructive hover:underline"
            >
              إلغاء
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default OfflineDownloadButton;
