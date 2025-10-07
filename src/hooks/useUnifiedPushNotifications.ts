/**
 * Hook unifié pour les notifications push (native + web)
 */

import { useState, useEffect, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import { nativeNotificationService } from '@/services/notifications/nativeNotificationService';
import { usePushNotifications } from './usePushNotifications';
import { logger } from '@/utils/logger';

interface UseUnifiedPushNotificationsReturn {
  isSupported: boolean;
  isSubscribed: boolean;
  isLoading: boolean;
  permission: NotificationPermission | 'unknown';
  platform: 'native' | 'web';
  subscribe: () => Promise<boolean>;
  unsubscribe: () => Promise<boolean>;
  requestPermission: () => Promise<NotificationPermission | boolean>;
}

export const useUnifiedPushNotifications = (): UseUnifiedPushNotificationsReturn => {
  const isNative = Capacitor.isNativePlatform();
  
  // Hook web pour PWA
  const webPush = usePushNotifications();
  
  // États pour native
  const [nativeState, setNativeState] = useState({
    isSupported: false,
    isSubscribed: false,
    isLoading: false,
    permission: 'unknown' as NotificationPermission | 'unknown'
  });

  // Initialisation
  useEffect(() => {
    if (isNative) {
      setNativeState(prev => ({
        ...prev,
        isSupported: nativeNotificationService.isSupported()
      }));
      
      // Vérifier le statut de l'abonnement
      checkNativeSubscription();
      
      // Configurer les listeners
      nativeNotificationService.setupListeners(
        (notification) => {
          logger.info('Notification received', notification);
        },
        (notification) => {
          logger.info('Notification action performed', notification);
        }
      );
    }
  }, [isNative]);

  const checkNativeSubscription = useCallback(async () => {
    if (!isNative) return;
    
    const hasToken = await nativeNotificationService.hasActiveToken();
    setNativeState(prev => ({ ...prev, isSubscribed: hasToken }));
  }, [isNative]);

  const subscribeNative = useCallback(async (): Promise<boolean> => {
    if (!isNative) return false;
    
    setNativeState(prev => ({ ...prev, isLoading: true }));
    
    try {
      const subscription = await nativeNotificationService.register();
      
      if (!subscription) {
        return false;
      }
      
      const saved = await nativeNotificationService.saveToken(subscription);
      
      if (saved) {
        setNativeState(prev => ({ 
          ...prev, 
          isSubscribed: true,
          permission: 'granted'
        }));
      }
      
      return saved;
    } catch (error) {
      logger.error('Native subscription failed', error);
      return false;
    } finally {
      setNativeState(prev => ({ ...prev, isLoading: false }));
    }
  }, [isNative]);

  const unsubscribeNative = useCallback(async (): Promise<boolean> => {
    if (!isNative) return false;
    
    setNativeState(prev => ({ ...prev, isLoading: true }));
    
    try {
      const removed = await nativeNotificationService.removeToken();
      
      if (removed) {
        setNativeState(prev => ({ 
          ...prev, 
          isSubscribed: false 
        }));
      }
      
      return removed;
    } catch (error) {
      logger.error('Native unsubscription failed', error);
      return false;
    } finally {
      setNativeState(prev => ({ ...prev, isLoading: false }));
    }
  }, [isNative]);

  const requestPermissionNative = useCallback(async (): Promise<boolean> => {
    if (!isNative) return false;
    
    const granted = await nativeNotificationService.requestPermission();
    
    setNativeState(prev => ({
      ...prev,
      permission: granted ? 'granted' : 'denied'
    }));
    
    return granted;
  }, [isNative]);

  // Retourner les bonnes valeurs selon la plateforme
  if (isNative) {
    return {
      isSupported: nativeState.isSupported,
      isSubscribed: nativeState.isSubscribed,
      isLoading: nativeState.isLoading,
      permission: nativeState.permission,
      platform: 'native',
      subscribe: subscribeNative,
      unsubscribe: unsubscribeNative,
      requestPermission: requestPermissionNative
    };
  }

  // Web (PWA)
  return {
    isSupported: webPush.isSupported,
    isSubscribed: webPush.isSubscribed,
    isLoading: webPush.isLoading,
    permission: webPush.permission,
    platform: 'web',
    subscribe: webPush.subscribe,
    unsubscribe: webPush.unsubscribe,
    requestPermission: webPush.requestPermission
  };
};
