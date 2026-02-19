/**
 * Hook de notifications push avec OneSignal Web
 * Utilise l'instance globale window.OneSignal initialisée via le script dans index.html
 */

import { useState, useEffect, useCallback } from 'react';
import { logger } from '@/utils/logger';
import { toast } from 'sonner';
import { oneSignalService } from '@/onesignal';
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
  const [oneSignalPlayerId, setOneSignalPlayerId] = useState<string | null>(null);
  const { user } = useAuth();

  // Vérifier si les notifications sont supportées
  const isSupported = 'Notification' in window && 'serviceWorker' in navigator;

  // Attendre que OneSignal soit initialisé
  const waitForOneSignal = useCallback(async (): Promise<boolean> => {
    return new Promise((resolve) => {
      if (window.OneSignal) {
        resolve(true);
      } else {
        window.OneSignalDeferred = window.OneSignalDeferred || [];
        window.OneSignalDeferred.push(() => {
          resolve(true);
        });
      }
    });
  }, []);

  // Initialisation au montage du composant
  useEffect(() => {
    const initialize = async () => {
      if (!isSupported) {
        logger.warn('⚠️ Notifications non supportées dans ce navigateur');
        setIsInitializing(false);
        return;
      }

      setIsInitializing(true);
      try {
        logger.info('🚀 Attente de l\'initialisation de OneSignal...');

        // Attendre que OneSignal soit prêt (initialisé via le script dans index.html)
        await waitForOneSignal();

        logger.success('✅ OneSignal prêt');
        
        // Configurer le listener pour les changements de subscription
        await oneSignalService.setupSubscriptionListener();
        
        // Récupérer l'état actuel
        const state = await oneSignalService.getPermissionState();
        setPermission(state.permission);
        setIsSubscribed(state.isSubscribed);
        setOneSignalPlayerId(state.playerId);
      } catch (error) {
        logger.error('❌ Erreur lors de l\'initialisation:', error);
      } finally {
        setIsInitializing(false);
      }
    };

    initialize();
  }, [isSupported, waitForOneSignal]);

  const subscribe = useCallback(async (): Promise<boolean> => {
    if (!user) {
      toast.error('Vous devez être connecté pour vous abonner aux notifications');
      return false;
    }

    if (!isSupported) {
      toast.error('Les notifications ne sont pas supportées sur ce navigateur');
      return false;
    }

    setIsLoading(true);
    try {
      logger.info('📝 Abonnement aux notifications...');

      const success = await oneSignalService.subscribe();

      if (success) {
        const state = await oneSignalService.getPermissionState();
        setPermission(state.permission);
        setIsSubscribed(state.isSubscribed);
        setOneSignalPlayerId(state.playerId);
        
        toast.success('✅ Abonné aux notifications avec succès');
        return true;
      } else {
        toast.error('❌ Échec de l\'abonnement aux notifications');
        return false;
      }
    } catch (error) {
      logger.error('❌ Erreur lors de l\'abonnement:', error);
      toast.error('Une erreur est survenue lors de l\'abonnement');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [user, isSupported]);

  const unsubscribe = useCallback(async (): Promise<boolean> => {
    if (!isSupported) {
      toast.error('Les notifications ne sont pas supportées sur ce navigateur');
      return false;
    }

    setIsLoading(true);
    try {
      logger.info('🔕 Désabonnement des notifications...');

      const success = await oneSignalService.unsubscribe();

      if (success) {
        setPermission(Notification.permission);
        setIsSubscribed(false);
        setOneSignalPlayerId(null);
        
        toast.success('✅ Désabonné des notifications avec succès');
        return true;
      } else {
        toast.error('❌ Échec du désabonnement');
        return false;
      }
    } catch (error) {
      logger.error('❌ Erreur lors du désabonnement:', error);
      toast.error('Une erreur est survenue lors du désabonnement');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [isSupported]);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!isSupported) {
      toast.error('Les notifications ne sont pas supportées sur ce navigateur');
      return false;
    }

    setIsLoading(true);
    try {
      logger.info('🔔 Demande de permission...');

      const result = await oneSignalService.requestPermission();
      setPermission(result);

      if (result === 'granted') {
        // Récupérer l'état mis à jour
        const state = await oneSignalService.getPermissionState();
        setIsSubscribed(state.isSubscribed);
        setOneSignalPlayerId(state.playerId);
        
        toast.success('✅ Permission accordée');
        return true;
      } else if (result === 'denied') {
        toast.error('❌ Permission refusée');
        return false;
      } else {
        toast.info('ℹ️ Permission non accordée');
        return false;
      }
    } catch (error) {
      logger.error('❌ Erreur lors de la demande de permission:', error);
      toast.error('Une erreur est survenue');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [isSupported]);

  const reinitialize = useCallback(async (): Promise<boolean> => {
    if (!isSupported) {
      toast.error('Les notifications ne sont pas supportées sur ce navigateur');
      return false;
    }

    setIsLoading(true);
    setIsInitializing(true);
    try {
      logger.info('🔄 Réinitialisation de OneSignal...');

      // Attendre que OneSignal soit prêt
      await waitForOneSignal();
      
      // Configurer le listener
      await oneSignalService.setupSubscriptionListener();
      
      // Récupérer l'état actuel
      const state = await oneSignalService.getPermissionState();
      setPermission(state.permission);
      setIsSubscribed(state.isSubscribed);
      setOneSignalPlayerId(state.playerId);

      toast.success('✅ OneSignal réinitialisé');
      return true;
    } catch (error) {
      logger.error('❌ Erreur lors de la réinitialisation:', error);
      toast.error('Erreur lors de la réinitialisation');
      return false;
    } finally {
      setIsLoading(false);
      setIsInitializing(false);
    }
  }, [isSupported, waitForOneSignal]);

  return {
    isSupported,
    isSubscribed,
    isLoading,
    isInitializing,
    permission,
    platform: 'web',
    platformName: 'web',
    deviceToken: oneSignalPlayerId,
    oneSignalPlayerId,
    subscribe,
    unsubscribe,
    requestPermission,
    reinitialize,
  };
};
