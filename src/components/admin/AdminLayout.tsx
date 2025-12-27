import { ReactNode, useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useUserRoles } from '@/hooks/useUserRoles';
import { useAdminRealtimeReports } from '@/hooks/useAdminRealtimeReports';
import { AdminSidebar } from './AdminSidebar';
import { Loader2, Menu } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface AdminLayoutProps {
  children: ReactNode;
}

export const AdminLayout = ({ children }: AdminLayoutProps) => {
  const { user, loading: authLoading } = useAuth();
  const { canAccessAdmin, isLoading: rolesLoading } = useUserRoles();
  const location = useLocation();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Enable real-time notifications for new reports
  useAdminRealtimeReports();

  // Prevent search engines from indexing admin pages
  useEffect(() => {
    let metaRobots = document.querySelector('meta[name="robots"]');
    const originalContent = metaRobots?.getAttribute('content') || '';
    
    if (metaRobots) {
      metaRobots.setAttribute('content', 'noindex, nofollow');
    } else {
      metaRobots = document.createElement('meta');
      metaRobots.setAttribute('name', 'robots');
      metaRobots.setAttribute('content', 'noindex, nofollow');
      document.head.appendChild(metaRobots);
    }

    const canonical = document.querySelector('link[rel="canonical"]');
    if (canonical) {
      canonical.setAttribute('href', '');
    }

    return () => {
      if (metaRobots) {
        if (originalContent) {
          metaRobots.setAttribute('content', originalContent);
        } else {
          metaRobots.remove();
        }
      }
    };
  }, []);

  // Log unauthorized access attempts
  useEffect(() => {
    const logUnauthorizedAccess = async () => {
      if (!authLoading && !rolesLoading && user && !canAccessAdmin) {
        try {
          await supabase.rpc('log_security_event', {
            p_action: 'unauthorized_admin_access',
            p_path: location.pathname,
            p_details: { 
              user_id: user.id,
              attempted_at: new Date().toISOString()
            }
          });
        } catch (error) {
          console.error('Failed to log security event:', error);
        }
      }
    };
    logUnauthorizedAccess();
  }, [authLoading, rolesLoading, user, canAccessAdmin, location.pathname]);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  if (authLoading || rolesLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
          <p className="text-muted-foreground text-sm">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (!canAccessAdmin) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen flex w-full bg-background" dir="rtl">
      {/* Mobile Menu Button */}
      <button
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        className="lg:hidden fixed top-4 right-4 z-50 p-2 bg-card rounded-lg shadow-lg border border-border"
      >
        <Menu className="w-6 h-6" />
      </button>

      {/* Mobile Overlay */}
      {mobileMenuOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar - Fixed on all screens */}
      <div className={cn(
        "fixed top-0 right-0 z-40 h-screen",
        "transition-transform duration-300",
        mobileMenuOpen ? "translate-x-0" : "translate-x-full lg:translate-x-0"
      )}>
        <AdminSidebar 
          isCollapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        />
      </div>

      {/* Main Content - with margin to account for fixed sidebar */}
      <main className={cn(
        "flex-1 min-h-screen overflow-auto p-4 lg:p-8 transition-all duration-300",
        sidebarCollapsed ? "lg:mr-20" : "lg:mr-64"
      )}>
        <div className="max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
};
