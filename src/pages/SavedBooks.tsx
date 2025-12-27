import { Link } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useOfflineBooks, getOfflineStorageSize } from '@/hooks/useOfflineBooks';
import { useOfflineDownload } from '@/hooks/useOfflineDownload';
import { useOnlineStatus } from '@/hooks/useOfflineStorage';
import { BookOpen, Trash2, WifiOff, Download, HardDrive, X, Loader2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useState, useEffect } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';

const SavedBooks = () => {
  const { savedBooks, isLoading, removeBook } = useOfflineBooks();
  const { downloads, cancelDownload, formatSize } = useOfflineDownload();
  const isOnline = useOnlineStatus();
  const [storageSize, setStorageSize] = useState<string>('');

  // Convert downloads Map to array for rendering
  const activeDownloads = Array.from(downloads.values()).filter(
    d => d.status === 'downloading'
  );

  useEffect(() => {
    getOfflineStorageSize().then(setStorageSize);
  }, [savedBooks]);

  if (isLoading) {
    return (
      <Layout>
        <div className="section-container py-8 lg:py-12">
          <Skeleton className="h-8 w-64 mb-8" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-48 rounded-2xl" />
            ))}
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="section-container py-8 lg:py-12">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-foreground mb-2">
              الكتب المحفوظة
            </h1>
            <p className="text-muted-foreground">
              الكتب التي حفظتها للقراءة بدون إنترنت
            </p>
          </div>
          
          <div className="flex items-center gap-4">
            {!isOnline && (
              <div className="flex items-center gap-2 px-4 py-2 bg-amber-500/10 text-amber-600 rounded-xl">
                <WifiOff className="w-4 h-4" />
                <span className="text-sm font-medium">غير متصل</span>
              </div>
            )}
            
            {storageSize && (
              <div className="flex items-center gap-2 px-4 py-2 bg-muted rounded-xl">
                <HardDrive className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">{storageSize}</span>
              </div>
            )}
          </div>
        </div>

        {/* Active Downloads */}
        {activeDownloads.length > 0 && (
          <div className="mb-6 space-y-3">
            <h2 className="text-lg font-bold text-foreground">جاري التحميل</h2>
            {activeDownloads.map((download) => (
              <div 
                key={download.bookId} 
                className="content-card p-4 flex items-center gap-4"
              >
                <Loader2 className="w-8 h-8 text-primary animate-spin flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">جاري تحميل الكتاب...</span>
                    <span className="text-muted-foreground">{download.progress}%</span>
                  </div>
                  <Progress value={download.progress} className="h-2" />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>
                      {formatSize(download.downloadedSize)} / {formatSize(download.totalSize)}
                    </span>
                    <button
                      onClick={() => cancelDownload(download.bookId)}
                      className="text-destructive hover:underline flex items-center gap-1"
                    >
                      <X className="w-3 h-3" />
                      إلغاء
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {savedBooks.length === 0 && activeDownloads.length === 0 ? (
          <div className="text-center py-16">
            <Download className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-bold text-foreground mb-2">لا توجد كتب محفوظة</h2>
            <p className="text-muted-foreground mb-6">
              احفظ الكتب للقراءة بدون إنترنت من صفحة تفاصيل الكتاب
            </p>
            <Link to="/categories">
              <Button className="btn-primary-glow">تصفح المكتبة</Button>
            </Link>
          </div>
        ) : savedBooks.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {savedBooks.map((savedBook) => (
              <div 
                key={savedBook.id} 
                className="content-card p-4 flex gap-4"
              >
                {/* Cover */}
                <div className="w-24 h-32 flex-shrink-0 rounded-xl overflow-hidden bg-muted">
                  {savedBook.coverBlob ? (
                    <img
                      src={URL.createObjectURL(savedBook.coverBlob)}
                      alt={savedBook.book.title}
                      className="w-full h-full object-cover"
                    />
                  ) : savedBook.book.cover_url ? (
                    <img
                      src={savedBook.book.cover_url}
                      alt={savedBook.book.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center">
                      <BookOpen className="w-8 h-8 text-primary-foreground" />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 flex flex-col">
                  <h3 className="font-bold text-foreground line-clamp-2 mb-1">
                    {savedBook.book.title}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-2">
                    {savedBook.book.author}
                  </p>
                  
                  <p className="text-xs text-muted-foreground mb-auto">
                    تم الحفظ {formatDistanceToNow(savedBook.savedAt, { addSuffix: true, locale: ar })}
                  </p>

                  <div className="flex items-center gap-2 mt-3">
                    <Link to={`/book/${savedBook.id}/read`} className="flex-1">
                      <Button 
                        size="sm" 
                        className="w-full gap-2"
                        disabled={!savedBook.fileBlob}
                      >
                        <BookOpen className="w-4 h-4" />
                        اقرأ
                      </Button>
                    </Link>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
                      onClick={() => removeBook(savedBook.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default SavedBooks;
