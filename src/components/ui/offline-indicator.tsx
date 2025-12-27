import { WifiOff, Wifi, RefreshCw } from 'lucide-react';
import { useOnlineStatus } from '@/hooks/useOfflineStorage';
import { useOfflineSync, getPendingSyncCount } from '@/hooks/useOfflineSync';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from './button';

export function OfflineIndicator() {
  const isOnline = useOnlineStatus();
  const { syncAll } = useOfflineSync();
  const [showBanner, setShowBanner] = useState(false);
  const [wasOffline, setWasOffline] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    // Update pending count periodically
    const updatePending = () => setPendingCount(getPendingSyncCount());
    updatePending();
    const interval = setInterval(updatePending, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!isOnline) {
      setShowBanner(true);
      setWasOffline(true);
    } else if (wasOffline) {
      // Show "back online" briefly
      setShowBanner(true);
      const timer = setTimeout(() => {
        setShowBanner(false);
        setWasOffline(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [isOnline, wasOffline]);

  // Show banner if offline or has pending items
  const shouldShow = showBanner || (!isOnline) || (isOnline && pendingCount > 0);

  if (!shouldShow) return null;

  return (
    <div
      className={cn(
        'fixed top-16 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full shadow-lg flex items-center gap-2 transition-all duration-300 text-sm',
        'animate-in fade-in slide-in-from-top-2',
        isOnline
          ? pendingCount > 0 
            ? 'bg-blue-600 text-white'
            : 'bg-green-600 text-white'
          : 'bg-amber-500 text-amber-950'
      )}
    >
      {isOnline ? (
        pendingCount > 0 ? (
          <>
            <RefreshCw className="w-4 h-4" />
            <span className="font-medium">
              {pendingCount} في انتظار المزامنة
            </span>
            <Button
              size="sm"
              variant="secondary"
              className="h-6 text-xs px-2"
              onClick={() => syncAll()}
            >
              مزامنة
            </Button>
          </>
        ) : (
          <>
            <Wifi className="w-4 h-4" />
            <span className="font-medium">تم استعادة الاتصال</span>
          </>
        )
      ) : (
        <>
          <WifiOff className="w-4 h-4" />
          <span className="font-medium">غير متصل</span>
          {pendingCount > 0 && (
            <span className="text-xs opacity-80">
              ({pendingCount})
            </span>
          )}
        </>
      )}
    </div>
  );
}
