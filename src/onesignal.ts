/**
 * OneSignal Web Push Integration
 * Gère l'initialisation et les événements de notifications push avec OneSignal
 */

import OneSignal from 'react-onesignal';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

// Types
export interface OneSignalConfig {
  appId: string;
  allowLocalhostAsSecureOrigin?: boolean;
}

export interface NotificationPermissionState {
  permission: NotificationPermission;
  isSubscribed: boolean;
  playerId: string | null;
}

class OneSignalService {
  private isInitialized = false;
  private playerId: string | null = null;

  /**
   * Initialise OneSignal avec la configuration
   */
  async initialize(config: OneSignalConfig): Promise<boolean> {
    if (this.isInitialized) {
      logger.info('OneSignal déjà initialisé');
      return true;
    }

    try {
      logger.info('🚀 Initialisation de OneSignal...');

      await OneSignal.init({
        appId: config.appId,
        allowLocalhostAsSecureOrigin: config.allowLocalhostAsSecureOrigin || false,
        serviceWorkerParam: {
          scope: '/',
        },
        serviceWorkerPath: '/OneSignalSDKWorker.js',
      });

      // Écouter les changements de subscription
      OneSignal.User.PushSubscription.addEventListener('change', (event) => {
        logger.info('📬 Changement de subscription OneSignal:', event);
        this.handleSubscriptionChange();
      });

      this.isInitialized = true;
      logger.success('✅ OneSignal initialisé avec succès');

      // Récupérer le Player ID si déjà abonné
      await this.updatePlayerId();

      return true;
    } catch (error) {
      logger.error('❌ Erreur lors de l\'initialisation de OneSignal:', error);
      return false;
    }
  }

  /**
   * Demande la permission de notifications
   */
  async requestPermission(): Promise<NotificationPermission> {
    try {
      logger.info('🔔 Demande de permission de notifications...');
      
      const permission = await OneSignal.Notifications.requestPermission();
      logger.info('Permission:', permission);

      if (permission) {
        await this.updatePlayerId();
      }

      return Notification.permission;
    } catch (error) {
      logger.error('❌ Erreur lors de la demande de permission:', error);
      return 'denied';
    }
  }

  /**
   * Vérifie si l'utilisateur est abonné
   */
  async isSubscribed(): Promise<boolean> {
    try {
      const optedIn = await OneSignal.User.PushSubscription.optedIn;
      return optedIn;
    } catch (error) {
      logger.error('❌ Erreur lors de la vérification de l\'abonnement:', error);
      return false;
    }
  }

  /**
   * Récupère le Player ID OneSignal
   */
  async getPlayerId(): Promise<string | null> {
    try {
      const id = await OneSignal.User.PushSubscription.id;
      this.playerId = id;
      return id;
    } catch (error) {
      logger.error('❌ Erreur lors de la récupération du Player ID:', error);
      return null;
    }
  }

  /**
   * Met à jour le Player ID en cache et dans la BDD
   */
  private async updatePlayerId(): Promise<void> {
    try {
      const playerId = await this.getPlayerId();
      
      if (!playerId) {
        logger.warn('⚠️ Aucun Player ID disponible');
        return;
      }

      this.playerId = playerId;
      logger.success('✅ Player ID récupéré:', playerId);

      // Sauvegarder dans Supabase
      await this.savePlayerIdToProfile(playerId);
    } catch (error) {
      logger.error('❌ Erreur lors de la mise à jour du Player ID:', error);
    }
  }

  /**
   * Sauvegarde le Player ID dans le profil Supabase
   */
  async savePlayerIdToProfile(playerId: string): Promise<boolean> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        logger.warn('⚠️ Utilisateur non connecté, impossible de sauvegarder le Player ID');
        return false;
      }

      const { error } = await supabase
        .from('profiles')
        .update({
          onesignal_player_id: playerId,
          device_platform: 'web',
        })
        .eq('id', user.id);

      if (error) {
        logger.error('❌ Erreur lors de la sauvegarde du Player ID:', error);
        return false;
      }

      logger.success('✅ Player ID sauvegardé dans le profil');
      return true;
    } catch (error) {
      logger.error('❌ Erreur lors de la sauvegarde du Player ID:', error);
      return false;
    }
  }

  /**
   * Supprime le Player ID du profil
   */
  async clearPlayerIdFromProfile(): Promise<boolean> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        logger.warn('⚠️ Utilisateur non connecté');
        return false;
      }

      const { error } = await supabase
        .from('profiles')
        .update({
          onesignal_player_id: null,
          device_platform: null,
        })
        .eq('id', user.id);

      if (error) {
        logger.error('❌ Erreur lors de la suppression du Player ID:', error);
        return false;
      }

      logger.success('✅ Player ID supprimé du profil');
      return true;
    } catch (error) {
      logger.error('❌ Erreur lors de la suppression du Player ID:', error);
      return false;
    }
  }

  /**
   * Gère les changements de subscription
   */
  private async handleSubscriptionChange(): Promise<void> {
    try {
      const subscribed = await this.isSubscribed();
      
      if (subscribed) {
        await this.updatePlayerId();
      } else {
        await this.clearPlayerIdFromProfile();
      }
    } catch (error) {
      logger.error('❌ Erreur lors du changement de subscription:', error);
    }
  }

  /**
   * S'abonner aux notifications
   */
  async subscribe(): Promise<boolean> {
    try {
      logger.info('📝 Abonnement aux notifications...');
      
      const permission = await this.requestPermission();
      
      if (permission !== 'granted') {
        logger.warn('⚠️ Permission refusée');
        return false;
      }

      await this.updatePlayerId();
      return true;
    } catch (error) {
      logger.error('❌ Erreur lors de l\'abonnement:', error);
      return false;
    }
  }

  /**
   * Se désabonner des notifications
   */
  async unsubscribe(): Promise<boolean> {
    try {
      logger.info('🔕 Désabonnement des notifications...');
      
      await OneSignal.User.PushSubscription.optOut();
      await this.clearPlayerIdFromProfile();
      
      this.playerId = null;
      
      logger.success('✅ Désabonné avec succès');
      return true;
    } catch (error) {
      logger.error('❌ Erreur lors du désabonnement:', error);
      return false;
    }
  }

  /**
   * Récupère l'état actuel des permissions et de l'abonnement
   */
  async getPermissionState(): Promise<NotificationPermissionState> {
    try {
      const permission = Notification.permission;
      const isSubscribed = await this.isSubscribed();
      const playerId = await this.getPlayerId();

      return {
        permission,
        isSubscribed,
        playerId,
      };
    } catch (error) {
      logger.error('❌ Erreur lors de la récupération de l\'état:', error);
      return {
        permission: 'default',
        isSubscribed: false,
        playerId: null,
      };
    }
  }

  /**
   * Envoie une notification via l'API OneSignal
   * Utilise la fonction edge de Supabase pour sécuriser la clé API
   */
  async sendNotification(params: {
    title: string;
    message: string;
    userId?: string;
    userIds?: string[];
  }): Promise<boolean> {
    try {
      logger.info('📤 Envoi de notification:', params);

      const { data, error } = await supabase.functions.invoke('send-push-notification', {
        body: {
          title: params.title,
          message: params.message,
          userId: params.userId,
          userIds: params.userIds,
        },
      });

      if (error) {
        logger.error('❌ Erreur lors de l\'envoi:', error);
        return false;
      }

      logger.success('✅ Notification envoyée:', data);
      return true;
    } catch (error) {
      logger.error('❌ Erreur lors de l\'envoi de la notification:', error);
      return false;
    }
  }
}

// Export singleton
export const oneSignalService = new OneSignalService();
export default oneSignalService;
