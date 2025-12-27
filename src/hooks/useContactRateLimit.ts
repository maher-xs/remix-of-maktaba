import { useState, useCallback } from 'react';

interface RateLimitConfig {
  maxMessages: number;
  windowMinutes: number;
}

interface RateLimitState {
  count: number;
  firstMessageTime: number;
}

const STORAGE_KEY = 'contact_rate_limit';
const DEFAULT_CONFIG: RateLimitConfig = {
  maxMessages: 3, // Maximum 3 messages
  windowMinutes: 60, // Per hour
};

export const useContactRateLimit = (config: Partial<RateLimitConfig> = {}) => {
  const { maxMessages, windowMinutes } = { ...DEFAULT_CONFIG, ...config };
  const [isBlocked, setIsBlocked] = useState(false);

  const getState = useCallback((): RateLimitState | null => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return null;
      return JSON.parse(stored) as RateLimitState;
    } catch {
      return null;
    }
  }, []);

  const setState = useCallback((state: RateLimitState) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Ignore storage errors
    }
  }, []);

  const clearState = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore storage errors
    }
  }, []);

  const checkRateLimit = useCallback((): { allowed: boolean; remainingTime?: number; remainingMessages?: number } => {
    const now = Date.now();
    const windowMs = windowMinutes * 60 * 1000;
    const state = getState();

    // No previous state, allow
    if (!state) {
      return { allowed: true, remainingMessages: maxMessages };
    }

    // Check if window has expired
    const timeSinceFirst = now - state.firstMessageTime;
    if (timeSinceFirst >= windowMs) {
      clearState();
      return { allowed: true, remainingMessages: maxMessages };
    }

    // Check if limit exceeded
    if (state.count >= maxMessages) {
      const remainingTime = Math.ceil((windowMs - timeSinceFirst) / 60000);
      setIsBlocked(true);
      return { allowed: false, remainingTime, remainingMessages: 0 };
    }

    return { allowed: true, remainingMessages: maxMessages - state.count };
  }, [maxMessages, windowMinutes, getState, clearState]);

  const recordMessage = useCallback(() => {
    const now = Date.now();
    const windowMs = windowMinutes * 60 * 1000;
    const state = getState();

    if (!state) {
      setState({ count: 1, firstMessageTime: now });
      return;
    }

    // Check if window has expired
    const timeSinceFirst = now - state.firstMessageTime;
    if (timeSinceFirst >= windowMs) {
      setState({ count: 1, firstMessageTime: now });
      return;
    }

    // Increment count
    setState({ count: state.count + 1, firstMessageTime: state.firstMessageTime });

    // Check if now blocked
    if (state.count + 1 >= maxMessages) {
      setIsBlocked(true);
    }
  }, [maxMessages, windowMinutes, getState, setState]);

  const getRemainingTime = useCallback((): number => {
    const state = getState();
    if (!state) return 0;

    const now = Date.now();
    const windowMs = windowMinutes * 60 * 1000;
    const timeSinceFirst = now - state.firstMessageTime;

    if (timeSinceFirst >= windowMs) return 0;

    return Math.ceil((windowMs - timeSinceFirst) / 60000);
  }, [windowMinutes, getState]);

  return {
    checkRateLimit,
    recordMessage,
    isBlocked,
    getRemainingTime,
  };
};
