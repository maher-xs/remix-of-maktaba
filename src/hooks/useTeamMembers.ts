import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface TeamMember {
  id: string;
  name: string;
  role: string;
  bio: string | null;
  avatar_url: string | null;
  social_links: Record<string, string>;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const useTeamMembers = () => {
  return useQuery({
    queryKey: ['team-members'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('team_members')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (error) throw error;
      return data as TeamMember[];
    },
  });
};

export const useAdminTeamMembers = () => {
  return useQuery({
    queryKey: ['admin-team-members'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('team_members')
        .select('*')
        .order('display_order', { ascending: true });

      if (error) throw error;
      return data as TeamMember[];
    },
  });
};

export const useCreateTeamMember = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (member: Omit<TeamMember, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await (supabase as any)
        .from('team_members')
        .insert(member)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-members'] });
      queryClient.invalidateQueries({ queryKey: ['admin-team-members'] });
      toast.success('تم إضافة العضو بنجاح');
    },
    onError: () => {
      toast.error('حدث خطأ أثناء إضافة العضو');
    },
  });
};

export const useUpdateTeamMember = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<TeamMember> & { id: string }) => {
      const { data, error } = await (supabase as any)
        .from('team_members')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-members'] });
      queryClient.invalidateQueries({ queryKey: ['admin-team-members'] });
      toast.success('تم تحديث العضو بنجاح');
    },
    onError: () => {
      toast.error('حدث خطأ أثناء تحديث العضو');
    },
  });
};

export const useDeleteTeamMember = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from('team_members')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-members'] });
      queryClient.invalidateQueries({ queryKey: ['admin-team-members'] });
      toast.success('تم حذف العضو بنجاح');
    },
    onError: () => {
      toast.error('حدث خطأ أثناء حذف العضو');
    },
  });
};
