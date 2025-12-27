import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useUserRoles } from './useUserRoles';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

const reasonLabels: Record<string, string> = {
  inappropriate: 'محتوى غير لائق',
  spam: 'سبام',
  copyright: 'انتهاك حقوق النشر',
  harassment: 'تحرش أو إساءة',
  other: 'سبب آخر',
};

const contentTypeLabels: Record<string, string> = {
  book: 'كتاب',
  review: 'مراجعة',
  profile: 'ملف شخصي',
  reading_list: 'قائمة قراءة',
  comment: 'تعليق',
};

export const useAdminRealtimeReports = () => {
  const { user } = useAuth();
  const { isAdmin } = useUserRoles();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!user || !isAdmin) return;

    const channel = supabase
      .channel('admin-reports-channel')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'content_reports',
        },
        (payload) => {
          const newReport = payload.new as {
            reason: string;
            content_type: string;
            description?: string;
          };

          // Show toast notification
          toast.error('بلاغ جديد!', {
            description: `${contentTypeLabels[newReport.content_type] || newReport.content_type} - ${reasonLabels[newReport.reason] || newReport.reason}`,
            duration: 10000,
            action: {
              label: 'عرض',
              onClick: () => {
                window.location.href = '/admin/reports';
              },
            },
          });

          // Invalidate queries to refresh data
          queryClient.invalidateQueries({ queryKey: ['content-reports'] });
          queryClient.invalidateQueries({ queryKey: ['report-stats'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, isAdmin, queryClient]);
};
