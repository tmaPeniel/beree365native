/**
 * Hook de notifications push unifié (version mock)
 * Les notifications ne sont pas encore configurées
 */

import { useState, useEffect, useCallback } from 'react';
import { logger } from '@/utils/logger';
import { toast } from 'sonner';

export type UseUnifiedPushNotificationsReturn = {
  isSupported: boolean;
  isSubscribed: boolean;
  isLoading: boolean;
  permission: NotificationPermission | 'unknown';
  platform: 'native' | 'web' | 'unknown';
  subscribe: () => Promise<boolean>;
  unsubscribe: () => Promise<boolean>;
  requestPermission: () => Promise<boolean>;
};

export const useUnifiedPushNotifications = (): UseUnifiedPushNotificationsReturn => {
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    logger.info("📵 Notifications non configurées");
  }, []);

  const subscribe = useCallback(async (): Promise<boolean> => {
    logger.info("📵 Notifications non configurées - abonnement impossible");
    toast.info("Les notifications ne sont pas encore configurées");
    return false;
  }, []);

  const unsubscribe = useCallback(async (): Promise<boolean> => {
    logger.info("📵 Notifications non configurées - désabonnement impossible");
    return false;
  }, []);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    logger.info("📵 Notifications non configurées - permission non demandée");
    toast.info("Les notifications ne sont pas encore configurées");
    return false;
  }, []);

  return {
    isSupported: false,
    isSubscribed: false,
    isLoading,
    permission: 'default',
    platform: 'unknown',
    subscribe,
    unsubscribe,
    requestPermission,
  };
};
