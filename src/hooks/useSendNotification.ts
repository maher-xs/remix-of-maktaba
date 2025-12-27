import { supabase } from '@/integrations/supabase/client';
import { Json } from '@/integrations/supabase/types';

export type NotificationType = 
  | 'report_resolved'
  | 'report_dismissed'
  | 'account_verified'
  | 'account_banned'
  | 'account_unbanned'
  | 'new_book'
  | 'review'
  | 'comment'
  | 'follow'
  | 'welcome'
  | 'system';

interface SendNotificationParams {
  userId: string;
  type: NotificationType;
  title: string;
  message?: string;
  data?: Json;
}

export const sendNotification = async ({
  userId,
  type,
  title,
  message,
  data,
}: SendNotificationParams): Promise<boolean> => {
  try {
    const { error } = await supabase.from('notifications').insert([{
      user_id: userId,
      type,
      title,
      message: message || null,
      data: data || null,
    }]);

    if (error) {
      console.error('Failed to send notification:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Failed to send notification:', error);
    return false;
  }
};

// Send push notification to all subscribers
export const sendPushNotificationToAll = async (payload: {
  title: string;
  body: string;
  icon?: string;
  data?: Record<string, unknown>;
}): Promise<boolean> => {
  try {
    const { data: session } = await supabase.auth.getSession();
    
    if (!session?.session) {
      console.error('No session for sending push notification');
      return false;
    }

    const { error } = await supabase.functions.invoke('send-push-notification', {
      body: {
        allUsers: true,
        payload: {
          title: payload.title,
          body: payload.body,
          icon: payload.icon || '/icons/icon-192x192.png',
          badge: '/icons/icon-192x192.png',
          data: payload.data || {}
        }
      }
    });

    if (error) {
      console.error('Failed to send push notification:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Failed to send push notification:', error);
    return false;
  }
};

// Notify about new book to all push subscribers
export const notifyNewBookPush = async (bookTitle: string, bookAuthor: string, bookId?: string) => {
  return sendPushNotificationToAll({
    title: '📚 كتاب جديد في المكتبة',
    body: `تم إضافة "${bookTitle}" للمؤلف ${bookAuthor}`,
    data: bookId ? { url: `/book/${bookId}` } : {}
  });
};

// Helper functions for common notifications
export const notifyReportResolved = async (userId: string, contentType: string) => {
  const contentTypeLabels: Record<string, string> = {
    book: 'الكتاب',
    review: 'التقييم',
    profile: 'الملف الشخصي',
    reading_list: 'قائمة القراءة',
    comment: 'التعليق',
  };

  return sendNotification({
    userId,
    type: 'report_resolved',
    title: 'تم معالجة بلاغك',
    message: `تم مراجعة بلاغك عن ${contentTypeLabels[contentType] || contentType} واتخاذ الإجراء المناسب. شكراً لمساهمتك في الحفاظ على جودة المحتوى.`,
    data: { contentType },
  });
};

export const notifyReportDismissed = async (userId: string, contentType: string) => {
  const contentTypeLabels: Record<string, string> = {
    book: 'الكتاب',
    review: 'التقييم',
    profile: 'الملف الشخصي',
    reading_list: 'قائمة القراءة',
    comment: 'التعليق',
  };

  return sendNotification({
    userId,
    type: 'report_dismissed',
    title: 'تم رفض بلاغك',
    message: `تمت مراجعة بلاغك عن ${contentTypeLabels[contentType] || contentType} وتبين أنه لا يخالف سياسات الموقع.`,
    data: { contentType },
  });
};

export const notifyAccountVerified = async (userId: string) => {
  return sendNotification({
    userId,
    type: 'account_verified',
    title: 'تم توثيق حسابك! ✓',
    message: 'مبروك! تم توثيق حسابك بنجاح. الآن يمكنك الاستمتاع بجميع مميزات الحساب الموثق.',
  });
};

export const notifyAccountBanned = async (userId: string, reason?: string) => {
  return sendNotification({
    userId,
    type: 'account_banned',
    title: 'تم حظر حسابك',
    message: reason || 'تم حظر حسابك بسبب مخالفة سياسات الموقع.',
    data: { reason },
  });
};

export const notifyAccountUnbanned = async (userId: string) => {
  return sendNotification({
    userId,
    type: 'account_unbanned',
    title: 'تم رفع الحظر عن حسابك',
    message: 'تم رفع الحظر عن حسابك. يمكنك الآن استخدام الموقع بشكل طبيعي.',
  });
};

export const notifyWelcome = async (userId: string, userName?: string) => {
  return sendNotification({
    userId,
    type: 'welcome',
    title: `مرحباً بك ${userName || ''} في مكتبتنا!`,
    message: 'نتمنى لك تجربة قراءة ممتعة. استكشف مكتبتنا الواسعة وابدأ رحلتك مع القراءة.',
  });
};
