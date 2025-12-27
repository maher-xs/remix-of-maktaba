import { Bell, BellOff, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePushNotifications } from '@/hooks/usePushNotifications';

interface PushNotificationToggleProps {
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  showLabel?: boolean;
}

export const PushNotificationToggle = ({
  variant = 'outline',
  size = 'default',
  showLabel = true
}: PushNotificationToggleProps) => {
  const { isSupported, isSubscribed, isLoading, permission, subscribe, unsubscribe } = usePushNotifications();

  if (!isSupported) {
    return null;
  }

  const handleToggle = async () => {
    if (isSubscribed) {
      await unsubscribe();
    } else {
      await subscribe();
    }
  };

  const getButtonContent = () => {
    if (isLoading) {
      return (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          {showLabel && <span>جاري التحميل...</span>}
        </>
      );
    }

    if (isSubscribed) {
      return (
        <>
          <Bell className="h-4 w-4 text-primary" />
          {showLabel && <span>الإشعارات مفعّلة</span>}
        </>
      );
    }

    if (permission === 'denied') {
      return (
        <>
          <BellOff className="h-4 w-4 text-destructive" />
          {showLabel && <span>الإشعارات محظورة</span>}
        </>
      );
    }

    return (
      <>
        <BellOff className="h-4 w-4" />
        {showLabel && <span>تفعيل الإشعارات</span>}
      </>
    );
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleToggle}
      disabled={isLoading || permission === 'denied'}
      className="gap-2"
    >
      {getButtonContent()}
    </Button>
  );
};
