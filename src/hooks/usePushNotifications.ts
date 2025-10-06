import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { pushNotificationService, type PushSubscriptionData } from '@/services/pushNotificationService';
import { supabase } from '@/integrations/supabase/client';

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

  // Récupérer la clé VAPID publique depuis le serveur
  useEffect(() => {
    const fetchVapidKey = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('get-vapid-public-key');
        
        if (error) {
          console.error('❌ Erreur récupération clé VAPID:', error);
          toast.error('Erreur lors de l\'initialisation des notifications');
          return;
        }
        
        if (data?.publicKey) {
          console.log('✅ Clé VAPID publique chargée');
          setVapidPublicKey(data.publicKey);
        }
      } catch (error) {
        console.error('❌ Erreur inattendue lors de la récupération de la clé VAPID:', error);
      }
    };

    fetchVapidKey();
  }, []);

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
  // Utilise maintenant la fonction sécurisée qui ne retourne pas les clés sensibles
  const checkExistingSubscription = useCallback(async () => {
    try {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration) {
        const subscription = await registration.pushManager.getSubscription();
        const hasLocalSubscription = !!subscription;
        
        // Vérifier aussi côté serveur avec la fonction sécurisée
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
    console.log('🔔 Tentative d\'abonnement aux notifications...');
    
    if (!isSupported) {
      console.error('❌ Notifications non supportées');
      toast.error('Les notifications push ne sont pas supportées');
      return false;
    }

    // Vérifier l'authentification
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      console.error('❌ Utilisateur non authentifié');
      toast.error('Vous devez être connecté pour activer les notifications');
      return false;
    }
    console.log('✅ Utilisateur authentifié');

    if (!vapidPublicKey) {
      console.error('❌ Clé VAPID publique non disponible');
      toast.error('Erreur de configuration des notifications');
      return false;
    }
    console.log('✅ Clé VAPID disponible');

    setIsLoading(true);

    try {
      // Demander la permission si nécessaire
      let currentPermission = permission;
      if (currentPermission !== 'granted') {
        console.log('⚠️ Permission non accordée, demande en cours...');
        currentPermission = await requestPermission();
        if (currentPermission !== 'granted') {
          console.error('❌ Permission refusée');
          return false;
        }
      }
      console.log('✅ Permission accordée');

      // Obtenir le service worker
      const registration = await navigator.serviceWorker.getRegistration();
      if (!registration) {
        console.error('❌ Service Worker non disponible');
        throw new Error('Service Worker non disponible');
      }
      console.log('✅ Service Worker disponible');

      // Créer l'abonnement push
      console.log('📝 Création de l\'abonnement push...');
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
      });

      console.log('✅ Abonnement push créé');

      // Extraire les données de l'abonnement
      const subscriptionData: PushSubscriptionData = {
        endpoint: subscription.endpoint,
        p256dh: btoa(String.fromCharCode(...new Uint8Array(subscription.getKey('p256dh')!))),
        auth: btoa(String.fromCharCode(...new Uint8Array(subscription.getKey('auth')!)))
      };

      console.log('💾 Sauvegarde de l\'abonnement sur le serveur...');
      // Sauvegarder l'abonnement sur le serveur Supabase
      const saved = await pushNotificationService.saveSubscription(subscriptionData);
      
      if (!saved) {
        console.error('❌ Échec de la sauvegarde sur le serveur');
        throw new Error('Échec de la sauvegarde de l\'abonnement sur le serveur');
      }

      console.log('✅ Abonnement sauvegardé avec succès');
      setIsSubscribed(true);
      toast.success('Abonnement aux notifications réussi');
      return true;

    } catch (error) {
      console.error('❌ Erreur lors de l\'abonnement aux notifications:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      toast.error(`Erreur lors de l'abonnement: ${errorMessage}`);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [isSupported, permission, requestPermission, vapidPublicKey]);

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