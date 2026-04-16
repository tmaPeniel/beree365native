/**
 * Hook de notifications push natif (Web Push API + VAPID)
 */

import { useState, useEffect, useCallback } from 'react';
import { logger } from '@/utils/logger';
import { toast } from 'sonner';
import { pushService } from '@/services/pushService';
import { useAuth } from './useAuth';

export type UseUnifiedPushNotificationsReturn = {
  isSupported: boolean;
  isSubscribed: boolean;
  isLoading: boolean;
  isInitializing: boolean;
  permission: 'granted' | 'denied' | 'prompt' | 'default' | 'unknown';
  platform: 'web';
  platformName: 'web';
  deviceToken: string | null;
  oneSignalPlayerId: string | null;
  subscribe: () => Promise<boolean>;
  unsubscribe: () => Promise<boolean>;
  requestPermission: () => Promise<boolean>;
  reinitialize: () => Promise<boolean>;
};

export const useUnifiedPushNotifications = (): UseUnifiedPushNotificationsReturn => {
  const [isLoading, setIsLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [permission, setPermission] = useState<'granted' | 'denied' | 'prompt' | 'default' | 'unknown'>('unknown');
  const { user } = useAuth();

  const isSupported = typeof window !== 'undefined' && 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window;

  // Initialisation
  useEffect(() => {
    const initialize = async () => {
      if (!isSupported) {
        setIsInitializing(false);
        return;
      }

      try {
        const state = await pushService.getPermissionState();
        setPermission(state.permission);
        setIsSubscribed(state.isSubscribed);
      } catch (error) {
        logger.error('❌ Erreur initialisation push:', error);
      } finally {
        setIsInitializing(false);
      }
    };

    initialize();
  }, [isSupported]);

  const subscribe = useCallback(async (): Promise<boolean> => {
    if (!user) {
      toast.error('Vous devez être connecté pour activer les notifications');
      return false;
    }
    if (!isSupported) {
      toast.error('Les notifications ne sont pas supportées sur ce navigateur');
      return false;
    }

    setIsLoading(true);
    try {
      const success = await pushService.subscribe();
      if (success) {
        const state = await pushService.getPermissionState();
        setPermission(state.permission);
        setIsSubscribed(true);
        toast.success('✅ Notifications activées');
        return true;
      } else {
        toast.error('❌ Échec de l\'activation des notifications');
        return false;
      }
    } catch (error) {
      logger.error('❌ Erreur abonnement:', error);
      toast.error('Une erreur est survenue');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [user, isSupported]);

  const unsubscribe = useCallback(async (): Promise<boolean> => {
    if (!isSupported) return false;

    setIsLoading(true);
    try {
      const success = await pushService.unsubscribe();
      if (success) {
        setPermission(Notification.permission);
        setIsSubscribed(false);
        toast.success('✅ Notifications désactivées');
        return true;
      }
      return false;
    } catch (error) {
      logger.error('❌ Erreur désabonnement:', error);
      toast.error('Une erreur est survenue');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [isSupported]);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!isSupported) return false;

    setIsLoading(true);
    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      if (result === 'granted') {
        toast.success('✅ Permission accordée');
        return true;
      }
      toast.error('❌ Permission refusée');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [isSupported]);

  const reinitialize = useCallback(async (): Promise<boolean> => {
    if (!isSupported) return false;

    setIsLoading(true);
    setIsInitializing(true);
    try {
      const state = await pushService.getPermissionState();
      setPermission(state.permission);
      setIsSubscribed(state.isSubscribed);
      toast.success('✅ État des notifications rafraîchi');
      return true;
    } catch (error) {
      logger.error('❌ Erreur réinitialisation:', error);
      return false;
    } finally {
      setIsLoading(false);
      setIsInitializing(false);
    }
  }, [isSupported]);

  return {
    isSupported,
    isSubscribed,
    isLoading,
    isInitializing,
    permission,
    platform: 'web',
    platformName: 'web',
    deviceToken: null,
    oneSignalPlayerId: null, // Kept for backward compatibility
    subscribe,
    unsubscribe,
    requestPermission,
    reinitialize,
  };
};
