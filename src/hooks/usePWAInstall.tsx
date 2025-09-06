import { useState, useEffect, useCallback } from 'react';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export const usePWAInstall = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [hasBeenPrompted, setHasBeenPrompted] = useState(false);

  useEffect(() => {
    // Check if already prompted in this session
    const prompted = sessionStorage.getItem('pwa-install-prompted');
    if (prompted) {
      setHasBeenPrompted(true);
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsInstallable(true);
    };

    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      setIsInstallable(false);
      setIsInstalling(false);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const promptInstall = useCallback(async () => {
    if (!deferredPrompt) return { outcome: 'not-available' };

    setIsInstalling(true);
    
    try {
      await deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      
      setDeferredPrompt(null);
      setIsInstallable(false);
      
      return choiceResult;
    } catch (error) {
      console.error('Error during PWA installation:', error);
      return { outcome: 'error' };
    } finally {
      setIsInstalling(false);
    }
  }, [deferredPrompt]);

  const markAsPrompted = useCallback(() => {
    setHasBeenPrompted(true);
    sessionStorage.setItem('pwa-install-prompted', 'true');
  }, []);

  const shouldShowInstallPrompt = isInstallable && !hasBeenPrompted;

  return {
    isInstallable,
    isInstalling,
    shouldShowInstallPrompt,
    promptInstall,
    markAsPrompted,
  };
};