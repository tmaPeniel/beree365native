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
   * Sauvegarde le Player ID dans user_devices ET profiles (compatibilité)
   */
  async savePlayerIdToProfile(playerId: string): Promise<boolean> {
    try {
      console.log('💾 Tentative de sauvegarde du Player ID:', playerId);
      
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        logger.warn('⚠️ Utilisateur non connecté, impossible de sauvegarder le Player ID');
        return false;
      }

      console.log('👤 Utilisateur connecté:', user.id);

      // 1. Sauvegarder dans user_devices (support multi-appareils)
      const { error: devicesError } = await supabase
        .from('user_devices')
        .upsert({
          user_id: user.id,
          onesignal_player_id: playerId,
          device_platform: 'web',
          last_seen_at: new Date().toISOString(),
          is_active: true,
        }, {
          onConflict: 'user_id,onesignal_player_id'
        });

      if (devicesError) {
        logger.error('❌ Erreur user_devices:', devicesError);
        console.error('❌ Erreur user_devices:', devicesError);
      } else {
        console.log('✅ Player ID sauvegardé dans user_devices');
      }

      // 2. Sauvegarder aussi dans profiles (compatibilité avec send-push-notification)
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          onesignal_player_id: playerId,
          device_platform: 'web',
        })
        .eq('id', user.id);

      if (profileError) {
        logger.error('❌ Erreur profiles:', profileError);
        console.error('❌ Erreur profiles:', profileError);
      } else {
        console.log('✅ Player ID sauvegardé dans profiles');
      }

      const success = !devicesError && !profileError;
      if (success) {
        logger.success('✅ Player ID sauvegardé dans les deux tables');
      }
      
      return success;
    } catch (error) {
      logger.error('❌ Erreur lors de la sauvegarde du Player ID:', error);
      console.error('❌ Erreur globale:', error);
      return false;
    }
  }

  /**
   * Marque l'appareil comme inactif dans user_devices
   */
  async clearPlayerIdFromProfile(): Promise<boolean> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        logger.warn('⚠️ Utilisateur non connecté');
        return false;
      }

      const playerId = await this.getPlayerId();
      
      if (!playerId) {
        logger.warn('⚠️ Aucun Player ID à supprimer');
        return true;
      }

      const { error } = await supabase
        .from('user_devices')
        .update({ is_active: false })
        .eq('user_id', user.id)
        .eq('onesignal_player_id', playerId);

      if (error) {
        logger.error('❌ Erreur lors de la désactivation de l\'appareil:', error);
        return false;
      }

      logger.success('✅ Appareil marqué comme inactif');
      return true;
    } catch (error) {
      logger.error('❌ Erreur lors de la désactivation de l\'appareil:', error);
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
      
      // Attendre que OneSignal traite l'abonnement (augmenté à 2s)
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Récupérer le Player ID avec retry si nécessaire
      let playerId = await this.getPlayerId();
      console.log('🔍 Premier essai - Player ID:', playerId);
      
      // Si pas de player ID, réessayer après 1s
      if (!playerId) {
        console.log('⏳ Player ID non disponible, retry dans 1s...');
        await new Promise(resolve => setTimeout(resolve, 1000));
        playerId = await this.getPlayerId();
        console.log('🔍 Deuxième essai - Player ID:', playerId);
      }
      
      if (playerId) {
        await this.savePlayerIdToProfile(playerId);
        this.playerId = playerId;
      } else {
        logger.warn('⚠️ Player ID non disponible après abonnement');
        console.warn('⚠️ Player ID non disponible après abonnement');
      }
      
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
