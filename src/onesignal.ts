/**
 * OneSignal Web Push Integration
 * Service simplifié utilisant l'instance globale window.OneSignal
 * L'initialisation se fait automatiquement via le script dans index.html
 */

import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

// Déclaration des types globaux OneSignal
declare global {
  interface Window {
    OneSignal: any;
    OneSignalDeferred: any[];
  }
}

export interface NotificationPermissionState {
  permission: NotificationPermission;
  isSubscribed: boolean;
  playerId: string | null;
}

class OneSignalService {
  private playerId: string | null = null;

  /**
   * Attend que OneSignal soit initialisé
   */
  private async waitForOneSignal(): Promise<any> {
    return new Promise((resolve) => {
      if (window.OneSignal) {
        resolve(window.OneSignal);
      } else {
        window.OneSignalDeferred = window.OneSignalDeferred || [];
        window.OneSignalDeferred.push((OneSignal: any) => {
          resolve(OneSignal);
        });
      }
    });
  }

  /**
   * Demande la permission de notifications
   */
  async requestPermission(): Promise<NotificationPermission> {
    try {
      logger.info('🔔 Demande de permission de notifications...');
      
      const OneSignal = await this.waitForOneSignal();
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
      const OneSignal = await this.waitForOneSignal();
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
      const OneSignal = await this.waitForOneSignal();
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
        .update({ onesignal_player_id: playerId })
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
   * Supprime le Player ID du profil Supabase
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
        .update({ onesignal_player_id: null })
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
   * S'abonner aux notifications
   */
  async subscribe(): Promise<boolean> {
    try {
      logger.info('📝 Abonnement aux notifications...');
      
      const OneSignal = await this.waitForOneSignal();
      
      // Vérifier d'abord la permission
      const currentPermission = Notification.permission;
      
      if (currentPermission === 'denied') {
        logger.error('❌ Permission de notifications refusée');
        return false;
      }

      // Si permission pas encore demandée, la demander
      if (currentPermission === 'default') {
        await this.requestPermission();
      }

      // S'abonner
      await OneSignal.User.PushSubscription.optIn();
      
      // Attendre un peu pour que OneSignal traite l'abonnement
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Récupérer et sauvegarder le Player ID
      await this.updatePlayerId();
      
      const isNowSubscribed = await this.isSubscribed();
      
      if (isNowSubscribed) {
        logger.success('✅ Abonné aux notifications avec succès');
        return true;
      } else {
        logger.error('❌ Échec de l\'abonnement');
        return false;
      }
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
      
      const OneSignal = await this.waitForOneSignal();
      await OneSignal.User.PushSubscription.optOut();
      
      // Supprimer le Player ID du profil
      await this.clearPlayerIdFromProfile();
      this.playerId = null;
      
      logger.success('✅ Désabonné des notifications avec succès');
      return true;
    } catch (error) {
      logger.error('❌ Erreur lors du désabonnement:', error);
      return false;
    }
  }

  /**
   * Gère le changement de subscription
   */
  private async handleSubscriptionChange(): Promise<void> {
    try {
      const isSubscribed = await this.isSubscribed();
      
      if (isSubscribed) {
        await this.updatePlayerId();
      } else {
        await this.clearPlayerIdFromProfile();
        this.playerId = null;
      }
    } catch (error) {
      logger.error('❌ Erreur lors du traitement du changement de subscription:', error);
    }
  }

  /**
   * Configure l'écoute des changements de subscription
   */
  async setupSubscriptionListener(): Promise<void> {
    try {
      const OneSignal = await this.waitForOneSignal();
      
      OneSignal.User.PushSubscription.addEventListener('change', () => {
        logger.info('📬 Changement de subscription OneSignal');
        this.handleSubscriptionChange();
      });
    } catch (error) {
      logger.error('❌ Erreur lors de la configuration du listener:', error);
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
        permission: 'denied',
        isSubscribed: false,
        playerId: null,
      };
    }
  }

  /**
   * Envoie une notification push via l'edge function Supabase
   */
  async sendNotification(params: {
    title: string;
    message: string;
    userId?: string;
    userIds?: string[];
  }): Promise<boolean> {
    try {
      logger.info('📤 Envoi de notification push...', params);

      const { data, error } = await supabase.functions.invoke('send-push-notification', {
        body: params,
      });

      if (error) {
        logger.error('❌ Erreur lors de l\'envoi de la notification:', error);
        return false;
      }

      logger.success('✅ Notification envoyée avec succès:', data);
      return true;
    } catch (error) {
      logger.error('❌ Erreur lors de l\'envoi de la notification:', error);
      return false;
    }
  }
}

// Instance singleton
export const oneSignalService = new OneSignalService();
