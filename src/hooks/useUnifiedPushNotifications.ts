/**
 * Hook de notifications push unifié avec Despia et OneSignal
 */

import { useState, useEffect, useCallback } from 'react';
import { logger } from '@/utils/logger';
import { toast } from 'sonner';
import { despiaNotificationService } from '@/services/notifications/despiaNotificationService';
import { useAuth } from './useAuth';

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
  const [isSubscribed, setIsSubscribed] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    // Vérifier si on a déjà un Player ID
    const playerId = despiaNotificationService.getPlayerID();
    if (playerId) {
      setIsSubscribed(true);
      logger.info("✅ Utilisateur déjà abonné aux notifications");
    }
  }, []);

  const subscribe = useCallback(async (): Promise<boolean> => {
    if (!user) {
      toast.error("Vous devez être connecté pour vous abonner aux notifications");
      return false;
    }

    setIsLoading(true);
    try {
      const playerId = despiaNotificationService.getPlayerID();
      
      if (!playerId) {
        toast.error("Impossible de récupérer l'ID du joueur OneSignal");
        return false;
      }

      const success = await despiaNotificationService.savePlayerID(user.id, playerId);
      
      if (success) {
        setIsSubscribed(true);
        toast.success("Abonnement aux notifications réussi !");
        logger.success("✅ Abonnement aux notifications réussi");
        return true;
      } else {
        toast.error("Erreur lors de l'abonnement");
        return false;
      }
    } catch (error) {
      logger.error("❌ Erreur lors de l'abonnement:", error);
      toast.error("Erreur lors de l'abonnement aux notifications");
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const unsubscribe = useCallback(async (): Promise<boolean> => {
    if (!user) {
      return false;
    }

    setIsLoading(true);
    try {
      // Supprimer le Player ID de la base de données
      const success = await despiaNotificationService.savePlayerID(user.id, '');
      
      if (success) {
        setIsSubscribed(false);
        toast.success("Désabonnement réussi");
        logger.success("✅ Désabonnement réussi");
        return true;
      } else {
        toast.error("Erreur lors du désabonnement");
        return false;
      }
    } catch (error) {
      logger.error("❌ Erreur lors du désabonnement:", error);
      toast.error("Erreur lors du désabonnement");
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    // Despia gère automatiquement les permissions natives
    toast.info("Les permissions sont gérées automatiquement par l'application");
    return true;
  }, []);

  return {
    isSupported: true,
    isSubscribed,
    isLoading,
    permission: 'granted',
    platform: 'native',
    subscribe,
    unsubscribe,
    requestPermission,
  };
};
