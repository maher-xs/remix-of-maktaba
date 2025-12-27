import React, { forwardRef } from 'react';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ContentCardProps {
  icon?: LucideIcon;
  title?: string;
  children: React.ReactNode;
  className?: string;
  animationDelay?: string;
}

const ContentCard = forwardRef<HTMLDivElement, ContentCardProps>(
  ({ icon: Icon, title, children, className, animationDelay }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "content-card rounded-2xl p-8 animate-fade-up",
          className
        )}
        style={animationDelay ? { animationDelay } : undefined}
      >
        {(Icon || title) ? (
          <div className="flex items-start gap-4">
            {Icon && (
              <div className="content-card-icon w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0">
                <Icon className="w-6 h-6" />
              </div>
            )}
            <div className="flex-1">
              {title && (
                <h2 className="text-xl font-bold text-foreground mb-4">{title}</h2>
              )}
              <div className="text-muted-foreground leading-relaxed whitespace-pre-line">
                {children}
              </div>
            </div>
          </div>
        ) : (
          children
        )}
      </div>
    );
  }
);

ContentCard.displayName = 'ContentCard';

export default ContentCard;