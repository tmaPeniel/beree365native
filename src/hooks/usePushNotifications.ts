/**
 * Hook simplifié pour la gestion des notifications push
 */

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { ServiceWorkerManager } from '@/utils/serviceWorkerManager';
import { PushSubscriptionCleaner } from '@/utils/pushSubscriptionCleaner';
import { urlBase64ToUint8Array } from '@/utils/vapidConverter';
import { subscriptionService } from '@/services/notifications/subscriptionService';
import { PushSubscriptionData } from '@/types/notifications';
import { NOTIFICATION_MESSAGES } from '@/constants/notifications';
import { logger } from '@/utils/logger';

interface UsePushNotificationsReturn {
  isSupported: boolean;
  isSubscribed: boolean;
  isLoading: boolean;
  permission: NotificationPermission;
  subscribe: () => Promise<boolean>;
  unsubscribe: () => Promise<boolean>;
  requestPermission: () => Promise<NotificationPermission>;
}

export const usePushNotifications = (): UsePushNotificationsReturn => {
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [vapidPublicKey, setVapidPublicKey] = useState<string | null>(null);

  // Récupérer la clé VAPID
  useEffect(() => {
    const fetchVapidKey = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('get-vapid-public-key');
        
        if (error) {
          logger.error('Failed to fetch VAPID key', error);
          return;
        }
        
        if (data?.publicKey) {
          logger.success('VAPID key loaded');
          setVapidPublicKey(data.publicKey);
        }
      } catch (error) {
        logger.error('VAPID key fetch error', error);
      }
    };

    fetchVapidKey();
  }, []);

  // Vérifier le support
  useEffect(() => {
    const supported = ServiceWorkerManager.isSupported();
    setIsSupported(supported);
    
    if (supported) {
      setPermission(Notification.permission);
      checkExistingSubscription();
    }
  }, []);

  // Vérifier l'abonnement existant
  const checkExistingSubscription = useCallback(async () => {
    try {
      const localSub = await ServiceWorkerManager.getCurrentSubscription();
      const serverSub = await subscriptionService.hasActive();
      
      setIsSubscribed(!!localSub && serverSub);
    } catch (error) {
      logger.error('Failed to check subscription', error);
    }
  }, []);

  // Demander la permission
  const requestPermission = useCallback(async (): Promise<NotificationPermission> => {
    if (!isSupported) {
      toast.error('Les notifications push ne sont pas supportées sur cet appareil');
      return 'denied';
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      
      if (result === 'granted') {
        toast.success(NOTIFICATION_MESSAGES.PERMISSION_GRANTED);
      } else if (result === 'denied') {
        toast.error(NOTIFICATION_MESSAGES.PERMISSION_DENIED);
      }
      
      return result;
    } catch (error) {
      logger.error('Permission request failed', error);
      return 'denied';
    }
  }, [isSupported]);

  // S'abonner
  const subscribe = useCallback(async (): Promise<boolean> => {
    if (!isSupported || !vapidPublicKey) {
      toast.error('Configuration des notifications non disponible');
      return false;
    }

    // Vérifier l'authentification
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      toast.error(NOTIFICATION_MESSAGES.AUTH_REQUIRED);
      return false;
    }

    setIsLoading(true);

    try {
      // Demander la permission si nécessaire
      let currentPermission = permission;
      if (currentPermission !== 'granted') {
        currentPermission = await requestPermission();
        if (currentPermission !== 'granted') {
          return false;
        }
      }

      // Obtenir le service worker
      const registration = await ServiceWorkerManager.getRegistration();
      if (!registration) {
        throw new Error('Service Worker non disponible');
      }

      // Nettoyer l'ancien abonnement
      await PushSubscriptionCleaner.cleanupOldSubscription(
        (endpoint) => subscriptionService.remove(endpoint)
      );

      // Créer le nouvel abonnement
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
      });

      // Extraire les données
      const subscriptionData: PushSubscriptionData = {
        endpoint: subscription.endpoint,
        p256dh: btoa(String.fromCharCode(...new Uint8Array(subscription.getKey('p256dh')!))),
        auth: btoa(String.fromCharCode(...new Uint8Array(subscription.getKey('auth')!)))
      };

      // Sauvegarder sur le serveur
      const saved = await subscriptionService.save(subscriptionData);
      
      if (!saved) {
        throw new Error('Échec de la sauvegarde de l\'abonnement');
      }

      setIsSubscribed(true);
      toast.success(NOTIFICATION_MESSAGES.SUBSCRIPTION_SUCCESS);
      return true;

    } catch (error) {
      logger.error('Subscription failed', error);
      toast.error(NOTIFICATION_MESSAGES.SUBSCRIPTION_ERROR);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [isSupported, permission, requestPermission, vapidPublicKey]);

  // Se désabonner
  const unsubscribe = useCallback(async (): Promise<boolean> => {
    if (!isSupported) {
      return false;
    }

    setIsLoading(true);

    try {
      const subscription = await ServiceWorkerManager.getCurrentSubscription();
      if (subscription) {
        await subscriptionService.remove(subscription.endpoint);
        await subscription.unsubscribe();
        
        setIsSubscribed(false);
        toast.success(NOTIFICATION_MESSAGES.UNSUBSCRIPTION_SUCCESS);
        return true;
      }
      return false;
    } catch (error) {
      logger.error('Unsubscription failed', error);
      toast.error('Erreur lors du désabonnement');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [isSupported]);

  return {
    isSupported,
    isSubscribed,
    isLoading,
    permission,
    subscribe,
    unsubscribe,
    requestPermission
  };
};
