import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useLocation } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import { AlertTriangle, Construction, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { useOnlineStatus } from '@/hooks/useOfflineStorage';

interface PageGuardProps {
  children: React.ReactNode;
}

// Pages that should work offline without checking database
const OFFLINE_ALLOWED_PATHS = [
  '/saved-books',
  '/book/',
];

const PageGuard = ({ children }: PageGuardProps) => {
  const location = useLocation();
  const currentPath = location.pathname;
  const isOnline = useOnlineStatus();
  
  // Check if admin route or offline allowed path
  const isAdminRoute = currentPath.startsWith('/admin');
  const isOfflineAllowed = OFFLINE_ALLOWED_PATHS.some(path => currentPath.startsWith(path));

  // ALL HOOKS MUST BE CALLED BEFORE ANY CONDITIONAL RETURNS
  const { data: pageSettings, isLoading } = useQuery({
    queryKey: ['page-guard', currentPath],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('page_settings')
        .select('*')
        .eq('path', currentPath)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    enabled: isOnline && !isAdminRoute, // Only run when online and not admin route
  });

  const { data: globalMaintenance } = useQuery({
    queryKey: ['global-maintenance'],
    queryFn: async () => {
      // أولاً نتحقق من إعداد الصيانة المباشر
      const { data: maintenanceData } = await supabase
        .from('site_settings')
        .select('*')
        .eq('key', 'maintenance')
        .maybeSingle();
      
      if (maintenanceData?.value) {
        return maintenanceData.value as { enabled: boolean; message: string };
      }

      // ثانياً نتحقق من الإعدادات العامة (general) التي قد تحتوي على maintenanceMode
      const { data: generalData } = await supabase
        .from('site_settings')
        .select('*')
        .eq('key', 'general')
        .maybeSingle();
      
      if (generalData?.value) {
        const general = generalData.value as { maintenanceMode?: boolean; maintenanceMessage?: string };
        if (general.maintenanceMode) {
          return { 
            enabled: true, 
            message: general.maintenanceMessage || 'الموقع تحت الصيانة' 
          };
        }
      }

      return null;
    },
    staleTime: 1000 * 60 * 5,
    enabled: isOnline && !isAdminRoute, // Only run when online and not admin route
  });

  // NOW we can have conditional returns after all hooks are called
  
  // Don't check for admin routes
  if (isAdminRoute) {
    return <>{children}</>;
  }

  // Allow offline pages to work without database check
  if (!isOnline && isOfflineAllowed) {
    return <>{children}</>;
  }

  // While loading or offline, show children (don't block)
  if (isLoading || !isOnline) {
    return <>{children}</>;
  }

  // Check global maintenance first
  if (globalMaintenance?.enabled) {
    return (
      <Layout>
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="text-center max-w-md mx-auto px-4">
            <div className="w-20 h-20 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center mx-auto mb-6">
              <Construction className="w-10 h-10 text-yellow-600" />
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-4">
              الموقع تحت الصيانة
            </h1>
            <p className="text-muted-foreground mb-6">
              {globalMaintenance.message || 'نعمل على تحسين الموقع. يرجى المحاولة لاحقاً.'}
            </p>
          </div>
        </div>
      </Layout>
    );
  }

  // If no page settings found, allow access
  if (!pageSettings) {
    return <>{children}</>;
  }

  // Page is disabled
  if (!pageSettings.is_enabled) {
    return (
      <Layout>
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="text-center max-w-md mx-auto px-4">
            <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-6">
              <XCircle className="w-10 h-10 text-destructive" />
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-4">
              الصفحة غير متاحة
            </h1>
            <p className="text-muted-foreground mb-6">
              هذه الصفحة معطلة حالياً ولا يمكن الوصول إليها.
            </p>
            <Link to="/">
              <Button>العودة للرئيسية</Button>
            </Link>
          </div>
        </div>
      </Layout>
    );
  }

  // Page is under maintenance
  if (pageSettings.is_maintenance) {
    return (
      <Layout>
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="text-center max-w-md mx-auto px-4">
            <div className="w-20 h-20 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center mx-auto mb-6">
              <AlertTriangle className="w-10 h-10 text-yellow-600" />
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-4">
              الصفحة تحت الصيانة
            </h1>
            <p className="text-muted-foreground mb-6">
              {pageSettings.maintenance_message || 'نعمل على تحسين هذه الصفحة. يرجى المحاولة لاحقاً.'}
            </p>
            <Link to="/">
              <Button>العودة للرئيسية</Button>
            </Link>
          </div>
        </div>
      </Layout>
    );
  }

  // Page is enabled and not under maintenance
  return <>{children}</>;
};

export default PageGuard;
