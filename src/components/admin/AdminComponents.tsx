import { ReactNode } from 'react';
import { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface AdminPageHeaderProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  actions?: ReactNode;
  breadcrumb?: { label: string; href?: string }[];
}

export const AdminPageHeader = ({
  title,
  description,
  icon: Icon,
  actions,
}: AdminPageHeaderProps) => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
      <div className="flex items-center gap-3">
        {Icon && (
          <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
            <Icon className="w-6 h-6" />
          </div>
        )}
        <div>
          <h1 className="text-2xl font-bold text-foreground">{title}</h1>
          {description && (
            <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
          )}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
};

interface AdminSearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  children?: ReactNode;
}

export const AdminSearchBar = ({
  value,
  onChange,
  placeholder = 'بحث...',
  className,
  children,
}: AdminSearchBarProps) => {
  return (
    <div className={cn("flex flex-col sm:flex-row gap-3 mb-6", className)}>
      <div className="relative flex-1">
        <svg
          className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full h-10 pl-4 pr-10 rounded-lg border border-border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
        />
      </div>
      {children}
    </div>
  );
};

interface AdminEmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export const AdminEmptyState = ({
  icon: Icon,
  title,
  description,
  action,
}: AdminEmptyStateProps) => {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="p-4 rounded-full bg-muted/50 mb-4">
        <Icon className="w-10 h-10 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-1">{title}</h3>
      {description && (
        <p className="text-sm text-muted-foreground max-w-sm mb-4">{description}</p>
      )}
      {action && (
        <Button onClick={action.onClick} size="sm">
          {action.label}
        </Button>
      )}
    </div>
  );
};

interface AdminMiniStatProps {
  label: string;
  value: number | string;
  icon: LucideIcon;
  color?: string;
  trend?: { value: number; isUp: boolean };
}

export const AdminMiniStat = ({
  label,
  value,
  icon: Icon,
  color = 'text-primary',
  trend,
}: AdminMiniStatProps) => {
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-card border border-border">
      <div className={cn("p-2 rounded-lg bg-muted/50", color)}>
        <Icon className="w-4 h-4" />
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <div className="flex items-center gap-1">
          <span className="text-lg font-bold">{value}</span>
          {trend && (
            <span className={cn(
              "text-xs",
              trend.isUp ? "text-green-500" : "text-red-500"
            )}>
              {trend.isUp ? '↑' : '↓'}{trend.value}%
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

interface AdminStatsGridProps {
  children: ReactNode;
  columns?: 2 | 3 | 4 | 5;
}

export const AdminStatsGrid = ({ children, columns = 4 }: AdminStatsGridProps) => {
  const gridCols = {
    2: 'sm:grid-cols-2',
    3: 'sm:grid-cols-3',
    4: 'sm:grid-cols-2 lg:grid-cols-4',
    5: 'sm:grid-cols-2 lg:grid-cols-5',
  };

  return (
    <div className={cn("grid gap-3 mb-6", gridCols[columns])}>
      {children}
    </div>
  );
};

interface AdminCardProps {
  children: ReactNode;
  className?: string;
  noPadding?: boolean;
}

export const AdminCard = ({ children, className, noPadding }: AdminCardProps) => {
  return (
    <div className={cn(
      "rounded-xl border border-border bg-card",
      !noPadding && "p-4",
      className
    )}>
      {children}
    </div>
  );
};

export const AdminLoadingState = () => {
  return (
    <div className="flex items-center justify-center py-16">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-muted-foreground">جاري التحميل...</p>
      </div>
    </div>
  );
};

// Table wrapper with better styling
export const AdminTableWrapper = ({ children }: { children: ReactNode }) => {
  return (
    <div className="rounded-xl border border-border overflow-hidden">
      <div className="overflow-x-auto">
        {children}
      </div>
    </div>
  );
};
