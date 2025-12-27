import { useState, useEffect } from 'react';
import { RefreshCw, Check, WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useOfflineSync, getLastSyncTime } from '@/hooks/useOfflineSync';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';

export function SyncStatusIndicator() {
  const { user } = useAuth();
  const { syncAll, pendingCount, isOnline } = useOfflineSync();
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);

  useEffect(() => {
    setLastSync(getLastSyncTime());
    const interval = setInterval(() => {
      setLastSync(getLastSyncTime());
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  // Only show when there are pending items or offline
  if (!user || (isOnline && pendingCount === 0)) return null;

  const handleSync = async () => {
    setIsSyncing(true);
    await syncAll(true);
    setLastSync(new Date());
    setIsSyncing(false);
  };

  const getStatusIcon = () => {
    if (!isOnline) {
      return <WifiOff className="h-5 w-5" />;
    }
    if (isSyncing) {
      return <RefreshCw className="h-5 w-5 animate-spin" />;
    }
    return <Check className="h-5 w-5" />;
  };

  const getStatusColor = () => {
    if (!isOnline) return 'text-destructive';
    if (pendingCount > 0) return 'text-amber-500';
    return 'text-green-500';
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className={cn(
            'w-11 h-11 rounded-xl bg-muted/60 flex items-center justify-center hover:bg-muted active:scale-95 transition-all duration-200 touch-manipulation relative',
            getStatusColor()
          )}
          aria-label="حالة المزامنة"
        >
          {getStatusIcon()}
          {pendingCount > 0 && isOnline && (
            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-[10px] font-bold text-white">
              {pendingCount > 9 ? '9+' : pendingCount}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64 bg-popover border border-border shadow-lg" align="end">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className={cn('flex items-center justify-center', getStatusColor())}>
              {getStatusIcon()}
            </span>
            <span className="font-medium text-sm text-foreground">
              {!isOnline 
                ? 'غير متصل' 
                : isSyncing 
                  ? 'جاري المزامنة...' 
                  : pendingCount > 0 
                    ? `${pendingCount} في الانتظار` 
                    : 'تمت المزامنة'}
            </span>
          </div>

          {lastSync && (
            <p className="text-xs text-muted-foreground">
              آخر مزامنة: {formatDistanceToNow(lastSync, { addSuffix: true, locale: ar })}
            </p>
          )}

          {pendingCount > 0 && isOnline && (
            <Button
              size="sm"
              className="w-full"
              onClick={handleSync}
              disabled={isSyncing}
            >
              {isSyncing ? (
                <>
                  <RefreshCw className="h-4 w-4 ml-2 animate-spin" />
                  جاري المزامنة...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 ml-2" />
                  مزامنة الآن
                </>
              )}
            </Button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
