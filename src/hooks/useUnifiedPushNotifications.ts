/**
 * Hook unifié pour les notifications push via Capacitor (native + web)
 * Utilise Firebase Cloud Messaging sur toutes les plateformes
 */

import { useState, useEffect, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { nativeNotificationService } from '@/services/notifications/nativeNotificationService';
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
  // États unifiés pour toutes les plateformes
  const [state, setState] = useState({
    isSupported: false,
    isSubscribed: false,
    isLoading: false,
    permission: 'unknown' as NotificationPermission | 'unknown'
  });

  const checkPermission = useCallback(async (): Promise<NotificationPermission> => {
    if (Capacitor.isNativePlatform()) {
      try {
        const status = await PushNotifications.checkPermissions();
        return status.receive === 'granted' ? 'granted' : 
               status.receive === 'denied' ? 'denied' : 'default';
      } catch (error) {
        logger.error('Error checking native permissions', error);
        return 'default';
      }
    } else {
      return typeof Notification !== 'undefined' 
        ? Notification.permission 
        : 'default';
    }
  }, []);

  // Initialisation
  useEffect(() => {
    const initialize = async () => {
      const supported = nativeNotificationService.isSupported();
      const currentPermission = await checkPermission();
      const hasToken = await nativeNotificationService.hasActiveToken();
      
      setState({
        isSupported: supported,
        isSubscribed: hasToken,
        isLoading: false,
        permission: currentPermission
      });
      
      // Configurer les listeners
      nativeNotificationService.setupListeners(
        (notification) => {
          logger.info('Notification received', notification);
        },
        (notification) => {
          logger.info('Notification action performed', notification);
        }
      );
    };
    
    initialize();
  }, [checkPermission]);

  const checkSubscription = useCallback(async () => {
    const hasToken = await nativeNotificationService.hasActiveToken();
    setState(prev => ({ ...prev, isSubscribed: hasToken }));
  }, []);

  const subscribe = useCallback(async (): Promise<boolean> => {
    setState(prev => ({ ...prev, isLoading: true }));
    
    try {
      const subscription = await nativeNotificationService.register();
      
      if (!subscription) {
        return false;
      }
      
      const saved = await nativeNotificationService.saveToken(subscription);
      
      if (saved) {
        const currentPermission = await checkPermission();
        setState(prev => ({ 
          ...prev, 
          isSubscribed: true,
          permission: currentPermission
        }));
      }
      
      return saved;
    } catch (error) {
      logger.error('Subscription failed', error);
      return false;
    } finally {
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, [checkPermission]);

  const unsubscribe = useCallback(async (): Promise<boolean> => {
    setState(prev => ({ ...prev, isLoading: true }));
    
    try {
      const removed = await nativeNotificationService.removeToken();
      
      if (removed) {
        setState(prev => ({ 
          ...prev, 
          isSubscribed: false 
        }));
      }
      
      return removed;
    } catch (error) {
      logger.error('Unsubscription failed', error);
      return false;
    } finally {
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, []);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    const granted = await nativeNotificationService.requestPermission();
    
    const currentPermission = await checkPermission();
    setState(prev => ({
      ...prev,
      permission: currentPermission
    }));
    
    return granted;
  }, [checkPermission]);

  return {
    isSupported: state.isSupported,
    isSubscribed: state.isSubscribed,
    isLoading: state.isLoading,
    permission: state.permission,
    platform: 'web', // Toujours 'web' pour l'interface, même si c'est natif en arrière-plan
    subscribe,
    unsubscribe,
    requestPermission
  };
};
