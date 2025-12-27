import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export type ReportReason = 'inappropriate' | 'spam' | 'copyright' | 'harassment' | 'other';
export type ContentType = 'book' | 'review' | 'profile' | 'reading_list' | 'comment' | 'discussion' | 'reply';

interface ReportData {
  contentType: ContentType;
  contentId: string;
  reason: ReportReason;
  description?: string;
}

export function useContentReport() {
  const { user } = useAuth();
  const [isReporting, setIsReporting] = useState(false);

  const reportMutation = useMutation({
    mutationFn: async (data: ReportData) => {
      if (!user) throw new Error('يجب تسجيل الدخول للإبلاغ');

      const { error } = await supabase.from('content_reports').insert({
        reporter_id: user.id,
        content_type: data.contentType,
        content_id: data.contentId,
        reason: data.reason,
        description: data.description || null,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('تم إرسال البلاغ بنجاح', {
        description: 'سيتم مراجعته من قبل الإدارة'
      });
    },
    onError: (error: Error) => {
      console.error('Report error:', error);
      toast.error('فشل في إرسال البلاغ');
    },
  });

  const submitReport = async (data: ReportData): Promise<boolean> => {
    setIsReporting(true);
    try {
      await reportMutation.mutateAsync(data);
      return true;
    } catch {
      return false;
    } finally {
      setIsReporting(false);
    }
  };

  return {
    submitReport,
    isReporting: isReporting || reportMutation.isPending,
  };
}
