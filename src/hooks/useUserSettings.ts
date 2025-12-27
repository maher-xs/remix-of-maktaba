import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

interface UserSettings {
  monthly_reading_goal: number;
  notifications_enabled: boolean;
  athkar_enabled: boolean;
  athkar_interval_minutes: number;
  athkar_display_seconds: number;
}

const DEFAULT_SETTINGS: UserSettings = {
  monthly_reading_goal: 5,
  notifications_enabled: true,
  athkar_enabled: true,
  athkar_interval_minutes: 10,
  athkar_display_seconds: 15,
};

export const useUserSettings = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['user-settings', user?.id],
    queryFn: async (): Promise<UserSettings> => {
      if (!user) return DEFAULT_SETTINGS;

      const { data, error } = await supabase
        .from('user_settings')
        .select('monthly_reading_goal, notifications_enabled, athkar_enabled, athkar_interval_minutes, athkar_display_seconds')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching user settings:', error);
        return DEFAULT_SETTINGS;
      }

      return {
        monthly_reading_goal: data?.monthly_reading_goal ?? DEFAULT_SETTINGS.monthly_reading_goal,
        notifications_enabled: data?.notifications_enabled ?? DEFAULT_SETTINGS.notifications_enabled,
        athkar_enabled: data?.athkar_enabled ?? DEFAULT_SETTINGS.athkar_enabled,
        athkar_interval_minutes: data?.athkar_interval_minutes ?? DEFAULT_SETTINGS.athkar_interval_minutes,
        athkar_display_seconds: data?.athkar_display_seconds ?? DEFAULT_SETTINGS.athkar_display_seconds,
      };
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 10,
  });

  const updateNotifications = useMutation({
    mutationFn: async (enabled: boolean) => {
      if (!user) throw new Error('User not authenticated');

      const { data: existingData } = await supabase
        .from('user_settings')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (existingData) {
        const { error } = await supabase
          .from('user_settings')
          .update({ notifications_enabled: enabled })
          .eq('user_id', user.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('user_settings')
          .insert({ user_id: user.id, notifications_enabled: enabled });

        if (error) throw error;
      }

      return enabled;
    },
    onSuccess: (enabled) => {
      queryClient.setQueryData(['user-settings', user?.id], (old: UserSettings | undefined) => ({
        ...old,
        notifications_enabled: enabled,
      }));
      toast.success(enabled ? 'تم تفعيل الإشعارات' : 'تم إيقاف الإشعارات');
    },
    onError: () => {
      toast.error('حدث خطأ أثناء تحديث إعدادات الإشعارات');
    },
  });

  const updateAthkar = useMutation({
    mutationFn: async (enabled: boolean) => {
      if (!user) throw new Error('User not authenticated');

      const { data: existingData } = await supabase
        .from('user_settings')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (existingData) {
        const { error } = await supabase
          .from('user_settings')
          .update({ athkar_enabled: enabled })
          .eq('user_id', user.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('user_settings')
          .insert({ user_id: user.id, athkar_enabled: enabled });

        if (error) throw error;
      }

      return enabled;
    },
    onSuccess: (enabled) => {
      queryClient.setQueryData(['user-settings', user?.id], (old: UserSettings | undefined) => ({
        ...old,
        athkar_enabled: enabled,
      }));
      toast.success(enabled ? 'تم تفعيل الأذكار' : 'تم إيقاف الأذكار');
    },
    onError: () => {
      toast.error('حدث خطأ أثناء تحديث إعدادات الأذكار');
    },
  });

  const updateAthkarInterval = useMutation({
    mutationFn: async (minutes: number) => {
      if (!user) throw new Error('User not authenticated');

      const { data: existingData } = await supabase
        .from('user_settings')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (existingData) {
        const { error } = await supabase
          .from('user_settings')
          .update({ athkar_interval_minutes: minutes })
          .eq('user_id', user.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('user_settings')
          .insert({ user_id: user.id, athkar_interval_minutes: minutes });

        if (error) throw error;
      }

      return minutes;
    },
    onSuccess: (minutes) => {
      queryClient.setQueryData(['user-settings', user?.id], (old: UserSettings | undefined) => ({
        ...old,
        athkar_interval_minutes: minutes,
      }));
      toast.success(`تم تحديث وقت الأذكار إلى ${minutes} دقيقة`);
    },
    onError: () => {
      toast.error('حدث خطأ أثناء تحديث وقت الأذكار');
    },
  });

  const updateAthkarDisplaySeconds = useMutation({
    mutationFn: async (seconds: number) => {
      if (!user) throw new Error('User not authenticated');

      const { data: existingData } = await supabase
        .from('user_settings')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (existingData) {
        const { error } = await supabase
          .from('user_settings')
          .update({ athkar_display_seconds: seconds })
          .eq('user_id', user.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('user_settings')
          .insert({ user_id: user.id, athkar_display_seconds: seconds });

        if (error) throw error;
      }

      return seconds;
    },
    onSuccess: (seconds) => {
      queryClient.setQueryData(['user-settings', user?.id], (old: UserSettings | undefined) => ({
        ...old,
        athkar_display_seconds: seconds,
      }));
      toast.success(`تم تحديث مدة ظهور الأذكار إلى ${seconds} ثانية`);
    },
    onError: () => {
      toast.error('حدث خطأ أثناء تحديث مدة ظهور الأذكار');
    },
  });

  return {
    settings: query.data ?? DEFAULT_SETTINGS,
    isLoading: query.isLoading,
    updateNotifications: updateNotifications.mutate,
    isUpdatingNotifications: updateNotifications.isPending,
    updateAthkar: updateAthkar.mutate,
    isUpdatingAthkar: updateAthkar.isPending,
    updateAthkarInterval: updateAthkarInterval.mutate,
    isUpdatingAthkarInterval: updateAthkarInterval.isPending,
    updateAthkarDisplaySeconds: updateAthkarDisplaySeconds.mutate,
    isUpdatingAthkarDisplaySeconds: updateAthkarDisplaySeconds.isPending,
  };
};
