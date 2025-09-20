import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { pushNotificationService, type PushSubscriptionData } from '@/services/pushNotificationService';

interface UsePushNotificationsReturn {
  isSupported: boolean;
  isSubscribed: boolean;
  isLoading: boolean;
  permission: NotificationPermission;
  subscribe: () => Promise<boolean>;
  unsubscribe: () => Promise<boolean>;
  requestPermission: () => Promise<NotificationPermission>;
}

// Clé VAPID publique (à générer et configurer côté serveur)
const VAPID_PUBLIC_KEY = 'YOUR_VAPID_PUBLIC_KEY_HERE'; // À remplacer

export const usePushNotifications = (): UsePushNotificationsReturn => {
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');

  // Vérifier le support des notifications push
  useEffect(() => {
    const checkSupport = () => {
      const supported = 
        'serviceWorker' in navigator &&
        'PushManager' in window &&
        'Notification' in window;
      
      setIsSupported(supported);
      
      if (supported) {
        setPermission(Notification.permission);
        checkExistingSubscription();
      }
    };

    checkSupport();
  }, []);

  // Vérifier s'il y a déjà un abonnement existant
  const checkExistingSubscription = useCallback(async () => {
    try {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration) {
        const subscription = await registration.pushManager.getSubscription();
        const hasLocalSubscription = !!subscription;
        
        // Vérifier aussi côté serveur
        const hasServerSubscription = await pushNotificationService.hasActiveSubscription();
        
        setIsSubscribed(hasLocalSubscription && hasServerSubscription);
      }
    } catch (error) {
      console.error('Erreur lors de la vérification de l\'abonnement existant:', error);
    }
  }, []);

  // Demander la permission pour les notifications
  const requestPermission = useCallback(async (): Promise<NotificationPermission> => {
    if (!isSupported) {
      toast.error('Les notifications push ne sont pas supportées sur cet appareil');
      return 'denied';
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      
      if (result === 'granted') {
        toast.success('Permissions accordées pour les notifications');
      } else if (result === 'denied') {
        toast.error('Permissions refusées pour les notifications');
      }
      
      return result;
    } catch (error) {
      console.error('Erreur lors de la demande de permission:', error);
      toast.error('Erreur lors de la demande de permission');
      return 'denied';
    }
  }, [isSupported]);

  // Convertir la clé VAPID en Uint8Array
  const urlBase64ToUint8Array = (base64String: string): Uint8Array => {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  };

  // S'abonner aux notifications push
  const subscribe = useCallback(async (): Promise<boolean> => {
    if (!isSupported) {
      toast.error('Les notifications push ne sont pas supportées');
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
      const registration = await navigator.serviceWorker.getRegistration();
      if (!registration) {
        throw new Error('Service Worker non disponible');
      }

      // Créer l'abonnement push
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
      });

      // Extraire les données de l'abonnement
      const subscriptionData: PushSubscriptionData = {
        endpoint: subscription.endpoint,
        p256dh: btoa(String.fromCharCode(...new Uint8Array(subscription.getKey('p256dh')!))),
        auth: btoa(String.fromCharCode(...new Uint8Array(subscription.getKey('auth')!)))
      };

      // Sauvegarder l'abonnement sur le serveur Supabase
      const saved = await pushNotificationService.saveSubscription(subscriptionData);
      
      if (!saved) {
        throw new Error('Échec de la sauvegarde de l\'abonnement sur le serveur');
      }

      setIsSubscribed(true);
      toast.success('Abonnement aux notifications réussi');
      return true;

    } catch (error) {
      console.error('Erreur lors de l\'abonnement aux notifications:', error);
      toast.error('Erreur lors de l\'abonnement aux notifications');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [isSupported, permission, requestPermission]);

  // Se désabonner des notifications push
  const unsubscribe = useCallback(async (): Promise<boolean> => {
    if (!isSupported) {
      return false;
    }

    setIsLoading(true);

    try {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration) {
        const subscription = await registration.pushManager.getSubscription();
        if (subscription) {
          // Supprimer l'abonnement côté serveur
          await pushNotificationService.removeSubscription(subscription.endpoint);
          
          // Désabonner côté client
          await subscription.unsubscribe();
          
          setIsSubscribed(false);
          toast.success('Désabonnement réussi');
          return true;
        }
      }
      return false;
    } catch (error) {
      console.error('Erreur lors du désabonnement:', error);
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