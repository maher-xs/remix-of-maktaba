import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

const VAPID_PUBLIC_KEY = 'BLOUvo2H-_X0DrSrjGCyybyry3EP5DyW-FcblyZpRQtDsAeYElQrsmszslUwpKeGalLzN4xvoBtANhlafaUoEVI';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export const usePushNotifications = () => {
  const { user } = useAuth();
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');

  useEffect(() => {
    const checkSupport = async () => {
      const supported = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
      setIsSupported(supported);
      
      if (supported) {
        setPermission(Notification.permission);
        await checkSubscription();
      }
    };

    checkSupport();
  }, [user]);

  const checkSubscription = useCallback(async () => {
    if (!('serviceWorker' in navigator)) return;

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      setIsSubscribed(!!subscription);
    } catch (error) {
      console.error('Error checking subscription:', error);
    }
  }, []);

  const registerServiceWorker = async (): Promise<ServiceWorkerRegistration> => {
    const registration = await navigator.serviceWorker.register('/sw-push.js', {
      scope: '/'
    });
    
    // Wait for the service worker to be ready
    await navigator.serviceWorker.ready;
    return registration;
  };

  const subscribe = useCallback(async () => {
    if (!isSupported) {
      toast.error('المتصفح لا يدعم الإشعارات');
      return false;
    }

    setIsLoading(true);

    try {
      // Request permission
      const permissionResult = await Notification.requestPermission();
      setPermission(permissionResult);

      if (permissionResult !== 'granted') {
        toast.error('يجب السماح بالإشعارات لتفعيل هذه الميزة');
        setIsLoading(false);
        return false;
      }

      // Register service worker
      const registration = await registerServiceWorker();

      // Subscribe to push
      const applicationServerKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey.buffer as ArrayBuffer
      });

      // Get subscription keys
      const subscriptionJson = subscription.toJSON();
      const keys = subscriptionJson.keys;

      if (!keys?.p256dh || !keys?.auth) {
        throw new Error('Invalid subscription keys');
      }

      // Save to database
      const { error } = await supabase.from('push_subscriptions').upsert({
        user_id: user?.id || null,
        endpoint: subscription.endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth
      }, {
        onConflict: 'endpoint'
      });

      if (error) {
        console.error('Error saving subscription:', error);
        throw error;
      }

      setIsSubscribed(true);
      toast.success('تم تفعيل الإشعارات بنجاح');
      return true;
    } catch (error) {
      console.error('Error subscribing to push:', error);
      toast.error('حدث خطأ أثناء تفعيل الإشعارات');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [isSupported, user]);

  const unsubscribe = useCallback(async () => {
    setIsLoading(true);

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        // Remove from database
        await supabase
          .from('push_subscriptions')
          .delete()
          .eq('endpoint', subscription.endpoint);

        // Unsubscribe from push
        await subscription.unsubscribe();
      }

      setIsSubscribed(false);
      toast.success('تم إلغاء الإشعارات');
      return true;
    } catch (error) {
      console.error('Error unsubscribing:', error);
      toast.error('حدث خطأ أثناء إلغاء الإشعارات');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    isSupported,
    isSubscribed,
    isLoading,
    permission,
    subscribe,
    unsubscribe
  };
};
