import { RefreshCw } from 'lucide-react';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { cn } from '@/lib/utils';

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: React.ReactNode;
  disabled?: boolean;
}

const PullToRefresh = ({ onRefresh, children, disabled = false }: PullToRefreshProps) => {
  const { isPulling, isRefreshing, pullDistance, progress } = usePullToRefresh({
    onRefresh,
    threshold: 80,
    disabled,
  });

  const showIndicator = isPulling || isRefreshing;
  const indicatorOpacity = Math.min(progress * 1.5, 1);
  const rotation = isRefreshing ? 0 : progress * 180;

  return (
    <div className="relative">
      {/* Pull indicator */}
      <div
        className={cn(
          "fixed left-1/2 -translate-x-1/2 z-50 flex items-center justify-center transition-all duration-200 md:hidden",
          showIndicator ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        style={{
          top: `calc(72px + ${Math.min(pullDistance, 100)}px)`,
          opacity: indicatorOpacity,
        }}
      >
        <div className={cn(
          "w-10 h-10 rounded-full bg-background border border-border shadow-lg flex items-center justify-center",
          isRefreshing && "animate-pulse"
        )}>
          <RefreshCw
            className={cn(
              "w-5 h-5 text-primary transition-transform",
              isRefreshing && "animate-spin"
            )}
            style={{
              transform: isRefreshing ? undefined : `rotate(${rotation}deg)`,
            }}
          />
        </div>
      </div>

      {/* Content with pull effect */}
      <div
        style={{
          transform: isPulling && !isRefreshing ? `translateY(${pullDistance * 0.3}px)` : undefined,
          transition: isPulling ? 'none' : 'transform 0.3s ease-out',
        }}
      >
        {children}
      </div>
    </div>
  );
};

export default PullToRefresh;
