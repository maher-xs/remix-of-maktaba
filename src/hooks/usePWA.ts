import { useState, useEffect, useCallback } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface PWAState {
  isInstalled: boolean;
  isInstallable: boolean;
  isIOS: boolean;
  isAndroid: boolean;
  isStandalone: boolean;
  deferredPrompt: BeforeInstallPromptEvent | null;
}

export const usePWA = () => {
  const [state, setState] = useState<PWAState>({
    isInstalled: false,
    isInstallable: false,
    isIOS: false,
    isAndroid: false,
    isStandalone: false,
    deferredPrompt: null,
  });

  useEffect(() => {
    // Detect device and browser
    const userAgent = navigator.userAgent.toLowerCase();
    const isIOS = /iphone|ipad|ipod/.test(userAgent);
    const isAndroid = /android/.test(userAgent);
    
    // Check if running as standalone app
    const isStandalone = 
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true ||
      document.referrer.includes('android-app://');

    setState(prev => ({
      ...prev,
      isIOS,
      isAndroid,
      isStandalone,
      isInstalled: isStandalone,
    }));

    // Listen for beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setState(prev => ({
        ...prev,
        isInstallable: true,
        deferredPrompt: e as BeforeInstallPromptEvent,
      }));
    };

    // Listen for app installed event
    const handleAppInstalled = () => {
      setState(prev => ({
        ...prev,
        isInstalled: true,
        isInstallable: false,
        deferredPrompt: null,
      }));
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const promptInstall = useCallback(async (): Promise<boolean> => {
    if (!state.deferredPrompt) {
      return false;
    }

    await state.deferredPrompt.prompt();
    const { outcome } = await state.deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setState(prev => ({
        ...prev,
        isInstallable: false,
        deferredPrompt: null,
      }));
      return true;
    }
    
    return false;
  }, [state.deferredPrompt]);

  const canInstall = state.isInstallable && !state.isInstalled;

  return {
    ...state,
    canInstall,
    promptInstall,
  };
};
