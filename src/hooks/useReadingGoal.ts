import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

const DEFAULT_GOAL = 5;

export const useReadingGoal = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['reading-goal', user?.id],
    queryFn: async () => {
      if (!user) return DEFAULT_GOAL;

      const { data, error } = await supabase
        .from('user_settings')
        .select('monthly_reading_goal')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching reading goal:', error);
        return DEFAULT_GOAL;
      }

      return data?.monthly_reading_goal ?? DEFAULT_GOAL;
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 10,
  });

  const mutation = useMutation({
    mutationFn: async (newGoal: number) => {
      if (!user) throw new Error('User not authenticated');

      // Try to update first
      const { data: existingData } = await supabase
        .from('user_settings')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (existingData) {
        // Update existing record
        const { error } = await supabase
          .from('user_settings')
          .update({ monthly_reading_goal: newGoal })
          .eq('user_id', user.id);

        if (error) throw error;
      } else {
        // Insert new record
        const { error } = await supabase
          .from('user_settings')
          .insert({ user_id: user.id, monthly_reading_goal: newGoal });

        if (error) throw error;
      }

      return newGoal;
    },
    onSuccess: (newGoal) => {
      queryClient.setQueryData(['reading-goal', user?.id], newGoal);
      queryClient.invalidateQueries({ queryKey: ['monthly-reading-stats'] });
      toast.success('تم حفظ هدف القراءة بنجاح');
    },
    onError: (error) => {
      console.error('Error saving reading goal:', error);
      toast.error('حدث خطأ أثناء حفظ هدف القراءة');
    },
  });

  return {
    goal: query.data ?? DEFAULT_GOAL,
    isLoading: query.isLoading,
    updateGoal: mutation.mutate,
    isUpdating: mutation.isPending,
  };
};
