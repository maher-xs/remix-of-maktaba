import React, { forwardRef } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, Home } from 'lucide-react';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
}

const Breadcrumb = forwardRef<HTMLElement, BreadcrumbProps>(
  ({ items, className }, ref) => {
    return (
      <nav 
        ref={ref}
        className={`flex items-center gap-2 text-sm text-muted-foreground mb-6 overflow-hidden ${className || ''}`}
        aria-label="Breadcrumb"
      >
        <Link to="/" className="flex items-center hover:text-primary transition-colors shrink-0">
          <Home className="w-4 h-4" />
        </Link>
        
        {items.map((item, index) => (
          <div key={index} className="flex items-center gap-2 min-w-0">
            <ChevronLeft className="w-4 h-4 rtl-flip shrink-0" />
            {item.href ? (
              <Link to={item.href} className="hover:text-primary transition-colors truncate">
                {item.label}
              </Link>
            ) : (
              <span className="text-foreground font-medium truncate">{item.label}</span>
            )}
          </div>
        ))}
      </nav>
    );
  }
);

Breadcrumb.displayName = 'Breadcrumb';

export default Breadcrumb;