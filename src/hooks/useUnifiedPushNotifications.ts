/**
 * Hook unifié pour les notifications push via Capacitor (native + web)
 * Utilise Firebase Cloud Messaging sur toutes les plateformes
 */

import { useState, useEffect, useCallback } from 'react';
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

  // Initialisation
  useEffect(() => {
    setState(prev => ({
      ...prev,
      isSupported: nativeNotificationService.isSupported()
    }));
    
    // Vérifier le statut de l'abonnement
    checkSubscription();
    
    // Configurer les listeners
    nativeNotificationService.setupListeners(
      (notification) => {
        logger.info('Notification received', notification);
      },
      (notification) => {
        logger.info('Notification action performed', notification);
      }
    );
  }, []);

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
        setState(prev => ({ 
          ...prev, 
          isSubscribed: true,
          permission: 'granted'
        }));
      }
      
      return saved;
    } catch (error) {
      logger.error('Subscription failed', error);
      return false;
    } finally {
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, []);

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
    
    setState(prev => ({
      ...prev,
      permission: granted ? 'granted' : 'denied'
    }));
    
    return granted;
  }, []);

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
