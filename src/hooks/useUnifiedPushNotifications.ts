/**
 * Hook de notifications push unifié avec Capacitor, Despia et OneSignal
 * Supporte Android, iOS et Web (PWA)
 */

import { useState, useEffect, useCallback } from 'react';
import { logger } from '@/utils/logger';
import { toast } from 'sonner';
import { capacitorNotificationService } from '@/services/notifications/capacitorNotificationService';
import { despiaNotificationService } from '@/services/notifications/despiaNotificationService';
import { getPlatform, getPlatformName } from '@/utils/platformDetection';
import { useAuth } from './useAuth';

export type UseUnifiedPushNotificationsReturn = {
  isSupported: boolean;
  isSubscribed: boolean;
  isLoading: boolean;
  isInitializing: boolean;
  permission: 'granted' | 'denied' | 'prompt' | 'default' | 'prompt-with-rationale' | 'unknown';
  platform: 'despia' | 'capacitor' | 'web';
  platformName: 'ios' | 'android' | 'web';
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
  const [platform] = useState<'despia' | 'capacitor' | 'web'>(getPlatform());
  const [platformName] = useState<'ios' | 'android' | 'web'>(getPlatformName());
  const [permission, setPermission] = useState<'granted' | 'denied' | 'prompt' | 'default' | 'prompt-with-rationale' | 'unknown'>('unknown');
  const [deviceToken, setDeviceToken] = useState<string | null>(null);
  const [oneSignalPlayerId, setOneSignalPlayerId] = useState<string | null>(null);
  const { user } = useAuth();

  // Initialisation au montage du composant
  useEffect(() => {
    const initialize = async () => {
      setIsInitializing(true);
      try {
        logger.info(`🚀 Initialisation des notifications sur ${platform} (${platformName})`);

        if (platform === 'capacitor') {
          // Initialiser Capacitor
          const success = await capacitorNotificationService.initializePushNotifications();
          if (success) {
            logger.success("✅ Capacitor initialisé avec succès");
            
            // Récupérer les infos de l'appareil
            const deviceInfo = await capacitorNotificationService.getDeviceInfo();
            setDeviceToken(deviceInfo.deviceToken);
            setOneSignalPlayerId(deviceInfo.oneSignalPlayerId);
            
            // Vérifier les permissions
            const perm = await capacitorNotificationService.checkPermissions();
            setPermission(perm);
            
            // Si on a un Player ID, on est abonné
            if (deviceInfo.oneSignalPlayerId) {
              setIsSubscribed(true);
            }
          }
        } else if (platform === 'despia') {
          // Utiliser Despia (fallback)
          const playerId = despiaNotificationService.getPlayerID();
          if (playerId) {
            setIsSubscribed(true);
            setOneSignalPlayerId(playerId);
            setPermission('granted');
            logger.info("✅ Utilisateur déjà abonné via Despia");
          }
        } else {
          // Mode Web
          logger.info("🌐 Mode Web - initialisation des Web Push Notifications");
          const success = await capacitorNotificationService.initializePushNotifications();
          if (success && 'Notification' in window) {
            setPermission(Notification.permission === 'default' ? 'prompt' : Notification.permission);
          }
        }
      } catch (error) {
        logger.error("❌ Erreur lors de l'initialisation:", error);
      } finally {
        setIsInitializing(false);
      }
    };

    initialize();
  }, [platform, platformName]);

  const subscribe = useCallback(async (): Promise<boolean> => {
    if (!user) {
      toast.error("Vous devez être connecté pour vous abonner aux notifications");
      return false;
    }

    setIsLoading(true);
    try {
      if (platform === 'capacitor') {
        // Étape 1 : Demander les permissions
        logger.info("1️⃣ Demande des permissions...");
        const hasPermission = await capacitorNotificationService.requestPermissions();
        if (!hasPermission) {
          toast.error("Permissions de notification refusées");
          setPermission('denied');
          return false;
        }

        setPermission('granted');
        toast.info("Configuration en cours...", { duration: 2000 });

        // Étape 2 : Enregistrer l'appareil (NOUVEAU - séquentiel)
        logger.info("2️⃣ Enregistrement de l'appareil...");
        const registered = await capacitorNotificationService.registerDevice();
        if (!registered) {
          toast.error("Impossible d'enregistrer l'appareil");
          logger.error("❌ Échec de l'enregistrement");
          return false;
        }

        // Étape 3 : Récupérer les infos de l'appareil
        logger.info("3️⃣ Récupération des informations...");
        const deviceInfo = await capacitorNotificationService.getDeviceInfo();
        
        if (!deviceInfo.deviceToken) {
          toast.error("Token de l'appareil manquant");
          return false;
        }

        if (!deviceInfo.oneSignalPlayerId) {
          toast.error("Enregistrement OneSignal manquant");
          return false;
        }

        // Étape 4 : Sauvegarder dans la base de données
        logger.info("4️⃣ Sauvegarde dans la base de données...");
        const success = await capacitorNotificationService.saveDeviceInfo(
          user.id, 
          deviceInfo.deviceToken, 
          deviceInfo.oneSignalPlayerId
        );

        if (success) {
          setIsSubscribed(true);
          setDeviceToken(deviceInfo.deviceToken);
          setOneSignalPlayerId(deviceInfo.oneSignalPlayerId);
          setPermission('granted');
          toast.success("✅ Notifications activées avec succès !");
          logger.success("✅ Abonnement complet (Capacitor)");
          return true;
        } else {
          toast.error("Erreur lors de la sauvegarde");
          return false;
        }
      } else if (platform === 'despia') {
        // Fallback Despia
        const playerId = despiaNotificationService.getPlayerID();
        
        if (!playerId) {
          toast.error("Impossible de récupérer l'ID du joueur OneSignal");
          return false;
        }

        const success = await despiaNotificationService.savePlayerID(user.id, playerId);
        
        if (success) {
          setIsSubscribed(true);
          setOneSignalPlayerId(playerId);
          toast.success("Abonnement aux notifications réussi !");
          logger.success("✅ Abonnement aux notifications réussi (Despia)");
          return true;
        } else {
          toast.error("Erreur lors de l'abonnement");
          return false;
        }
      } else {
        // Mode Web
        toast.info("Pour les notifications web, utilisez la version PWA installable");
        return false;
      }
    } catch (error) {
      logger.error("❌ Erreur lors de l'abonnement:", error);
      toast.error("Erreur lors de l'abonnement aux notifications");
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [user, platform]);

  const unsubscribe = useCallback(async (): Promise<boolean> => {
    if (!user) {
      return false;
    }

    setIsLoading(true);
    try {
      if (platform === 'capacitor') {
        const success = await capacitorNotificationService.clearDeviceInfo(user.id);
        
        if (success) {
          setIsSubscribed(false);
          setDeviceToken(null);
          setOneSignalPlayerId(null);
          toast.success("Notifications désactivées");
          logger.success("✅ Désabonnement réussi (Capacitor)");
          return true;
        } else {
          toast.error("Erreur lors du désabonnement");
          return false;
        }
      } else if (platform === 'despia') {
        const success = await despiaNotificationService.savePlayerID(user.id, '');
        
        if (success) {
          setIsSubscribed(false);
          setOneSignalPlayerId(null);
          toast.success("Désabonnement réussi");
          logger.success("✅ Désabonnement réussi (Despia)");
          return true;
        } else {
          toast.error("Erreur lors du désabonnement");
          return false;
        }
      } else {
        toast.info("Aucune notification à désactiver");
        return false;
      }
    } catch (error) {
      logger.error("❌ Erreur lors du désabonnement:", error);
      toast.error("Erreur lors du désabonnement");
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [user, platform]);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    try {
      if (platform === 'capacitor') {
        const granted = await capacitorNotificationService.requestPermissions();
        const perm = await capacitorNotificationService.checkPermissions();
        setPermission(perm);
        
        if (granted) {
          toast.success("Permissions accordées");
          return true;
        } else {
          toast.error("Permissions refusées");
          return false;
        }
      } else if (platform === 'despia') {
        toast.info("Les permissions sont gérées automatiquement par l'application");
        return true;
      } else {
        // Mode Web
        if ('Notification' in window) {
          const perm = await Notification.requestPermission();
          setPermission(perm === 'default' ? 'prompt' : perm);
          return perm === 'granted';
        }
        return false;
      }
    } catch (error) {
      logger.error("❌ Erreur lors de la demande de permissions:", error);
      return false;
    }
  }, [platform]);

  const reinitialize = useCallback(async (): Promise<boolean> => {
    setIsInitializing(true);
    try {
      logger.info("🔄 Réinitialisation des notifications...");
      
      if (platform === 'capacitor') {
        const success = await capacitorNotificationService.initializePushNotifications();
        if (success) {
          const deviceInfo = await capacitorNotificationService.getDeviceInfo();
          setDeviceToken(deviceInfo.deviceToken);
          setOneSignalPlayerId(deviceInfo.oneSignalPlayerId);
          
          const perm = await capacitorNotificationService.checkPermissions();
          setPermission(perm);
          
          toast.success("Notifications réinitialisées");
          logger.success("✅ Réinitialisation réussie");
          return true;
        }
      }
      
      toast.error("Impossible de réinitialiser");
      return false;
    } catch (error) {
      logger.error("❌ Erreur lors de la réinitialisation:", error);
      toast.error("Erreur lors de la réinitialisation");
      return false;
    } finally {
      setIsInitializing(false);
    }
  }, [platform]);

  return {
    isSupported: platform === 'capacitor' || platform === 'despia',
    isSubscribed,
    isLoading,
    isInitializing,
    permission,
    platform,
    platformName,
    deviceToken,
    oneSignalPlayerId,
    subscribe,
    unsubscribe,
    requestPermission,
    reinitialize,
  };
};
