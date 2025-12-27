import { Link, useLocation } from 'react-router-dom';
import { Home, Search, BookOpen, MessageSquare, Settings } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { usePWA } from '@/hooks/usePWA';
import { cn } from '@/lib/utils';

interface NavItem {
  href: string;
  icon: React.ReactNode;
  label: string;
  requiresAuth?: boolean;
}

const MobileBottomNav = () => {
  const location = useLocation();
  const { user } = useAuth();
  const { isStandalone } = usePWA();

  // Hide on certain pages
  const hiddenPaths = ['/read/', '/auth'];
  const shouldHide = hiddenPaths.some(path => location.pathname.startsWith(path));
  
  if (shouldHide) {
    return null;
  }

  const navItems: NavItem[] = [
    {
      href: '/',
      icon: <Home className="w-5 h-5" />,
      label: 'الرئيسية',
    },
    {
      href: '/search',
      icon: <Search className="w-5 h-5" />,
      label: 'بحث',
    },
    {
      href: '/categories',
      icon: <BookOpen className="w-5 h-5" />,
      label: 'التصنيفات',
    },
    {
      href: '/discussions',
      icon: <MessageSquare className="w-5 h-5" />,
      label: 'المناقشات',
    },
    {
      href: '/settings',
      icon: <Settings className="w-5 h-5" />,
      label: 'الإعدادات',
    },
  ];

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <nav 
      className={cn(
        "fixed bottom-0 left-0 right-0 z-40 lg:hidden",
        "bg-background/95 backdrop-blur-lg border-t border-border/40"
      )}
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="flex items-center justify-around h-16">
        {navItems.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                "flex flex-col items-center justify-center gap-1 flex-1 h-full min-w-[64px]",
                "transition-colors duration-200 touch-manipulation tap-highlight",
                "active:scale-95 active:opacity-80",
                active 
                  ? "text-primary" 
                  : "text-muted-foreground"
              )}
            >
              <div className={cn(
                "p-2 rounded-xl transition-all",
                active && "bg-primary/10 scale-110"
              )}>
                {item.icon}
              </div>
              <span className={cn(
                "text-[11px] font-medium leading-none",
                active && "font-bold text-primary"
              )}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default MobileBottomNav;
