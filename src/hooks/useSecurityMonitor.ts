import { useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { rateLimiter, getClientFingerprint, type SecurityEventType } from '@/lib/security';
import { toast } from 'sonner';

interface SecurityMonitorOptions {
  enableRateLimiting?: boolean;
  maxRequestsPerMinute?: number;
  trackSuspiciousActivity?: boolean;
}

export const useSecurityMonitor = (options: SecurityMonitorOptions = {}) => {
  const { 
    enableRateLimiting = true, 
    maxRequestsPerMinute = 60,
    trackSuspiciousActivity = true 
  } = options;
  
  const { user } = useAuth();
  const fingerprintRef = useRef<string>('');
  const suspiciousActivityCount = useRef(0);

  // Get client fingerprint on mount
  useEffect(() => {
    fingerprintRef.current = getClientFingerprint();
  }, []);

  /**
   * Check rate limit before making a request
   */
  const checkRateLimit = useCallback((action?: string): boolean => {
    if (!enableRateLimiting) return true;

    const identifier = user?.id || fingerprintRef.current || 'anonymous';
    const result = rateLimiter.check(identifier, maxRequestsPerMinute, 60000);

    if (!result.allowed) {
      console.warn(`Rate limit exceeded for ${action || 'request'}`);
      toast.error('عدد الطلبات كثير جداً، يرجى الانتظار قليلاً');
      
      // Log rate limit event
      logSecurityEvent('rate_limit_exceeded', {
        action,
        remaining: result.remaining,
        resetIn: result.resetIn
      });
      
      return false;
    }

    return true;
  }, [enableRateLimiting, maxRequestsPerMinute, user?.id]);

  /**
   * Log security event to database
   */
  const logSecurityEvent = useCallback(async (
    eventType: SecurityEventType,
    details?: Record<string, unknown>,
    path?: string
  ) => {
    try {
      // Only log if user is authenticated (RLS requirement)
      if (!user?.id) {
        // For unauthenticated events, we can use the RPC function
        if (eventType === 'login_failed') {
          await supabase.rpc('log_failed_login', {
            p_email: (details?.email as string) || 'unknown',
            p_error_message: (details?.error as string) || undefined,
            p_ip_address: undefined,
            p_user_agent: navigator.userAgent
          });
        }
        return;
      }

      // Use the security definer function for authenticated users
      await supabase.rpc('add_security_log', {
        p_action: eventType,
        p_path: path || window.location.pathname,
        p_details: details ? JSON.parse(JSON.stringify(details)) : null
      });
    } catch (error) {
      console.error('Failed to log security event:', error);
    }
  }, [user?.id]);

  /**
   * Track suspicious activity patterns
   */
  const trackActivity = useCallback((activityType: string, isNormal: boolean) => {
    if (!trackSuspiciousActivity) return;

    if (!isNormal) {
      suspiciousActivityCount.current++;
      
      // Alert if too many suspicious activities
      if (suspiciousActivityCount.current >= 5) {
        logSecurityEvent('suspicious_activity', {
          type: activityType,
          count: suspiciousActivityCount.current,
          fingerprint: fingerprintRef.current
        });
        
        // Reset counter
        suspiciousActivityCount.current = 0;
      }
    }
  }, [trackSuspiciousActivity, logSecurityEvent]);

  /**
   * Validate and sanitize request before sending
   */
  const secureRequest = useCallback(async <T>(
    action: string,
    requestFn: () => Promise<T>
  ): Promise<T | null> => {
    // Check rate limit
    if (!checkRateLimit(action)) {
      return null;
    }

    try {
      const result = await requestFn();
      return result;
    } catch (error) {
      // Log failed requests
      logSecurityEvent('unauthorized_access', {
        action,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }, [checkRateLimit, logSecurityEvent]);

  /**
   * Monitor for DevTools opening (basic detection)
   */
  useEffect(() => {
    if (!trackSuspiciousActivity) return;

    const threshold = 160;
    let devToolsOpen = false;

    const checkDevTools = () => {
      const widthThreshold = window.outerWidth - window.innerWidth > threshold;
      const heightThreshold = window.outerHeight - window.innerHeight > threshold;
      
      if ((widthThreshold || heightThreshold) && !devToolsOpen) {
        devToolsOpen = true;
        // Just track, don't block - legitimate developers may use DevTools
        trackActivity('devtools_opened', true);
      } else if (!widthThreshold && !heightThreshold) {
        devToolsOpen = false;
      }
    };

    window.addEventListener('resize', checkDevTools);
    return () => window.removeEventListener('resize', checkDevTools);
  }, [trackSuspiciousActivity, trackActivity]);

  /**
   * Monitor for rapid clicking (potential bot behavior)
   */
  useEffect(() => {
    if (!trackSuspiciousActivity) return;

    let clickCount = 0;
    let lastClickTime = 0;

    const handleClick = () => {
      const now = Date.now();
      
      if (now - lastClickTime < 100) {
        clickCount++;
        
        if (clickCount > 10) {
          trackActivity('rapid_clicking', false);
          clickCount = 0;
        }
      } else {
        clickCount = 0;
      }
      
      lastClickTime = now;
    };

    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, [trackSuspiciousActivity, trackActivity]);

  return {
    checkRateLimit,
    logSecurityEvent,
    trackActivity,
    secureRequest,
    fingerprint: fingerprintRef.current
  };
};

export default useSecurityMonitor;
