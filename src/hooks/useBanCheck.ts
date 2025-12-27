import { useEffect, useState } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';

export const useBanCheck = () => {
  const { user, signOut } = useAuth();
  const [isBanned, setIsBanned] = useState(false);
  const [banReason, setBanReason] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const checkBanStatus = async () => {
      if (!user) {
        setIsChecking(false);
        setIsBanned(false);
        return;
      }

      try {
        const { data, error } = await supabase.rpc('is_user_banned', {
          check_user_id: user.id
        });

        if (error) throw error;

        if (data === true) {
          // Get ban reason
          const { data: profile } = await supabase
            .from('profiles')
            .select('banned_reason')
            .eq('id', user.id)
            .single();

          setIsBanned(true);
          setBanReason(profile?.banned_reason || null);

          // Log the banned user attempt
          await supabase.rpc('log_security_event', {
            p_action: 'banned_user_access_attempt',
            p_path: window.location.pathname,
            p_details: { user_id: user.id }
          });

          // Sign out the banned user
          await signOut();
        } else {
          setIsBanned(false);
          setBanReason(null);
        }
      } catch (error) {
        console.error('Error checking ban status:', error);
      } finally {
        setIsChecking(false);
      }
    };

    checkBanStatus();
  }, [user, signOut]);

  return { isBanned, banReason, isChecking };
};
