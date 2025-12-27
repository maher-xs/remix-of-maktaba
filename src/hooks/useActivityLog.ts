import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export type ActionType = 'create' | 'update' | 'delete';
export type EntityType = 'book' | 'category' | 'user' | 'setting' | 'review' | 'report';

interface LogActivityParams {
  actionType: ActionType;
  entityType: EntityType;
  entityId?: string;
  entityName?: string;
  details?: Record<string, any>;
}

export const useActivityLog = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const logActivity = useMutation({
    mutationFn: async (params: LogActivityParams) => {
      if (!user) return;

      const { error } = await supabase.from('activity_logs').insert({
        user_id: user.id,
        action_type: params.actionType,
        entity_type: params.entityType,
        entity_id: params.entityId || null,
        entity_name: params.entityName || null,
        details: params.details || null,
      });

      if (error) {
        console.error('Error logging activity:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activityLogs'] });
    },
  });

  return { logActivity: logActivity.mutate };
};

export const useAdminActivityLogs = (limit: number = 50) => {
  return useQuery({
    queryKey: ['activityLogs', limit],
    queryFn: async () => {
      // Calculate 24 hours ago
      const twentyFourHoursAgo = new Date();
      twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

      // Fetch activity logs from last 24 hours only
      const { data: logs, error: logsError } = await supabase
        .from('activity_logs')
        .select('*')
        .gte('created_at', twentyFourHoursAgo.toISOString())
        .order('created_at', { ascending: false })
        .limit(limit);

      if (logsError) throw logsError;
      
      if (!logs || logs.length === 0) return [];

      // Get unique user IDs
      const userIds = [...new Set(logs.map(log => log.user_id))];
      
      // Fetch profiles separately
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', userIds);

      if (profilesError) {
        console.error('Error fetching profiles:', profilesError);
      }

      // Map profiles to logs
      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
      
      return logs.map(log => ({
        ...log,
        profiles: profileMap.get(log.user_id) || null
      }));
    },
  });
};

// Hook to cleanup old activity logs (older than 24 hours)
export const useCleanupOldActivityLogs = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const twentyFourHoursAgo = new Date();
      twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

      const { error } = await supabase
        .from('activity_logs')
        .delete()
        .lt('created_at', twentyFourHoursAgo.toISOString());

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activityLogs'] });
    },
  });
};
