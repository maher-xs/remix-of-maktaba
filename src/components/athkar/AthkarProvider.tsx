import AthkarPopup from './AthkarPopup';
import { useUserSettings } from '@/hooks/useUserSettings';
import { useAuth } from '@/hooks/useAuth';

const AthkarProvider = () => {
  const { user } = useAuth();
  const { settings } = useUserSettings();

  // Only show athkar for authenticated users who have it enabled
  // For non-authenticated users, don't show by default
  if (!user) return null;

  return (
    <AthkarPopup 
      isEnabled={settings.athkar_enabled} 
      intervalMinutes={settings.athkar_interval_minutes}
      displaySeconds={settings.athkar_display_seconds}
    />
  );
};

export default AthkarProvider;
