import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export type AppRole = 'admin' | 'moderator' | 'user' | 'support';

interface UserRolesResult {
  roles: AppRole[];
  isAdmin: boolean;
  isModerator: boolean;
  isSupport: boolean;
  hasRole: (role: AppRole) => boolean;
  hasAnyRole: (roles: AppRole[]) => boolean;
  canAccessAdmin: boolean;
  isLoading: boolean;
}

export const useUserRoles = (): UserRolesResult => {
  const { user } = useAuth();

  const { data: roles = [], isLoading } = useQuery({
    queryKey: ['userRoles', user?.id],
    queryFn: async (): Promise<AppRole[]> => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);
      
      if (error) {
        console.error('Error fetching user roles:', error);
        return [];
      }
      
      return (data?.map(r => r.role) as AppRole[]) || [];
    },
    enabled: !!user,
  });

  const hasRole = (role: AppRole) => roles.includes(role);
  const hasAnyRole = (checkRoles: AppRole[]) => checkRoles.some(role => roles.includes(role));
  
  const isAdmin = hasRole('admin');
  const isModerator = hasRole('moderator');
  const isSupport = hasRole('support');
  
  // يمكن للأدمن والمشرفين والدعم الوصول للوحة الإدارة
  const canAccessAdmin = isAdmin || isModerator || isSupport;

  return {
    roles,
    isAdmin,
    isModerator,
    isSupport,
    hasRole,
    hasAnyRole,
    canAccessAdmin,
    isLoading,
  };
};

// تعريف الصلاحيات لكل قسم
export const menuPermissions = {
  dashboard: ['admin', 'moderator', 'support'] as AppRole[],
  books: ['admin', 'moderator'] as AppRole[],
  users: ['admin', 'support'] as AppRole[],
  categories: ['admin', 'moderator'] as AppRole[],
  reviews: ['admin', 'moderator'] as AppRole[],
  discussions: ['admin', 'moderator'] as AppRole[],
  reports: ['admin', 'moderator', 'support'] as AppRole[],
  messages: ['admin', 'support'] as AppRole[],
  roles: ['admin'] as AppRole[],
  ads: ['admin'] as AppRole[],
  pages: ['admin'] as AppRole[],
  appearance: ['admin'] as AppRole[],
  security: ['admin'] as AppRole[],
  securityDashboard: ['admin'] as AppRole[],
  blockedIps: ['admin'] as AppRole[],
  activity: ['admin'] as AppRole[],
  settings: ['admin'] as AppRole[],
};
