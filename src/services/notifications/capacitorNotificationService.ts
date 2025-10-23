/**
 * Service de notifications push avec Capacitor et OneSignal
 * Supporte Android, iOS et Web (PWA)
 */

import { Capacitor } from '@capacitor/core';
import { PushNotifications, Token, PushNotificationSchema, ActionPerformed } from '@capacitor/push-notifications';
import { logger } from "@/utils/logger";
import { supabase } from "@/integrations/supabase/client";
import { getPlatform, getPlatformName, isCapacitorNative, isWeb } from "@/utils/platformDetection";

export interface SendNotificationParams {
  title: string;
  message: string;
  userId?: string;
  userIds?: string[];
}

export interface DeviceInfo {
  deviceToken: string | null;
  oneSignalPlayerId: string | null;
  platform: 'ios' | 'android' | 'web';
}

class CapacitorNotificationService {
  private deviceToken: string | null = null;
  private oneSignalPlayerId: string | null = null;
  private isInitialized = false;
  private tokenResolvers: Array<(token: string) => void> = [];

  /**
   * Vérifie si on est sur une plateforme native
   */
  isNativePlatform(): boolean {
    return isCapacitorNative();
  }

  /**
   * Retourne la plateforme actuelle
   */
  getPlatform(): 'ios' | 'android' | 'web' {
    return getPlatformName();
  }

  /**
   * Initialise le service de notifications push
   */
  async initializePushNotifications(): Promise<boolean> {
    try {
      const platformType = getPlatform();
      logger.info(`🚀 Initialisation des notifications sur ${platformType}`);

      if (platformType === 'web') {
        logger.info("🌐 Mode Web - utiliser les Web Push Notifications");
        return this.initializeWebPush();
      }

      if (platformType === 'capacitor') {
        return this.initializeCapacitorPush();
      }

      logger.warn("⚠️ Plateforme non supportée pour Capacitor");
      return false;
    } catch (error) {
      logger.error("❌ Erreur lors de l'initialisation des notifications:", error);
      return false;
    }
  }

  /**
   * Initialise les notifications Capacitor (iOS/Android)
   * N'enregistre PAS automatiquement l'appareil - cela sera fait explicitement
   */
  private async initializeCapacitorPush(): Promise<boolean> {
    try {
      // Configuration des listeners seulement
      logger.info("🎧 Configuration des listeners de notifications...");

      // Écouter la réception du token
      await PushNotifications.addListener('registration', async (token: Token) => {
        try {
          logger.success("✅ Token reçu:", token.value);
          this.deviceToken = token.value;
          
          // Résoudre toutes les promesses en attente
          this.tokenResolvers.forEach(resolve => resolve(token.value));
          this.tokenResolvers = [];
          
          // Enregistrer l'appareil sur OneSignal
          await this.registerDeviceWithOneSignal(token.value);
        } catch (error) {
          logger.error("❌ Erreur dans le listener registration:", error);
        }
      });

      // Écouter les erreurs d'enregistrement
      await PushNotifications.addListener('registrationError', (error: any) => {
        logger.error("❌ Erreur d'enregistrement:", error);
        // Rejeter toutes les promesses en attente
        this.tokenResolvers = [];
      });

      // Écouter la réception des notifications
      await PushNotifications.addListener('pushNotificationReceived', (notification: PushNotificationSchema) => {
        try {
          logger.info("📬 Notification reçue:", notification);
        } catch (error) {
          logger.error("❌ Erreur dans le listener pushNotificationReceived:", error);
        }
      });

      // Écouter les actions sur les notifications
      await PushNotifications.addListener('pushNotificationActionPerformed', (notification: ActionPerformed) => {
        try {
          logger.info("👆 Action sur notification:", notification);
        } catch (error) {
          logger.error("❌ Erreur dans le listener pushNotificationActionPerformed:", error);
        }
      });

      this.isInitialized = true;
      logger.success("✅ Listeners Capacitor configurés");
      return true;
    } catch (error) {
      logger.error("❌ Erreur lors de l'initialisation Capacitor:", error);
      return false;
    }
  }

  /**
   * Initialise les notifications Web Push (PWA)
   */
  private async initializeWebPush(): Promise<boolean> {
    try {
      if (!('Notification' in window)) {
        logger.warn("⚠️ Les notifications ne sont pas supportées par ce navigateur");
        return false;
      }

      if (!('serviceWorker' in navigator)) {
        logger.warn("⚠️ Les Service Workers ne sont pas supportés");
        return false;
      }

      logger.info("🌐 Support Web Push détecté");
      
      // La permission sera demandée explicitement par l'utilisateur
      // via requestPermissions()
      
      this.isInitialized = true;
      return true;
    } catch (error) {
      logger.error("❌ Erreur lors de l'initialisation Web Push:", error);
      return false;
    }
  }

  /**
   * Demande les permissions de notification
   */
  async requestPermissions(): Promise<boolean> {
    try {
      const platformType = getPlatform();

      if (platformType === 'capacitor') {
        const result = await PushNotifications.requestPermissions();
        return result.receive === 'granted';
      }

      if (platformType === 'web') {
        if (!('Notification' in window)) {
          logger.warn("⚠️ Les notifications ne sont pas supportées");
          return false;
        }

        const permission = await Notification.requestPermission();
        return permission === 'granted';
      }

      return false;
    } catch (error) {
      logger.error("❌ Erreur lors de la demande de permissions:", error);
      return false;
    }
  }

  /**
   * Vérifie les permissions actuelles
   */
  async checkPermissions(): Promise<'granted' | 'denied' | 'prompt' | 'default' | 'prompt-with-rationale'> {
    try {
      const platformType = getPlatform();

      if (platformType === 'capacitor') {
        const result = await PushNotifications.checkPermissions();
        return result.receive;
      }

      if (platformType === 'web' && 'Notification' in window) {
        return Notification.permission === 'default' ? 'prompt' : Notification.permission;
      }

      return 'denied';
    } catch (error) {
      logger.error("❌ Erreur lors de la vérification des permissions:", error);
      return 'denied';
    }
  }

  /**
   * Attend la réception du token avec timeout
   */
  private waitForToken(timeoutMs: number): Promise<string | null> {
    return new Promise((resolve) => {
      // Si le token existe déjà, le retourner immédiatement
      if (this.deviceToken) {
        logger.debug("🔑 Token déjà disponible");
        resolve(this.deviceToken);
        return;
      }

      // Sinon, attendre l'événement avec timeout
      const timeout = setTimeout(() => {
        logger.warn("⏱️ Timeout lors de l'attente du token");
        // Retirer le resolver de la liste
        const index = this.tokenResolvers.indexOf(tokenResolver);
        if (index > -1) {
          this.tokenResolvers.splice(index, 1);
        }
        resolve(null);
      }, timeoutMs);

      const tokenResolver = (token: string) => {
        clearTimeout(timeout);
        resolve(token);
      };

      this.tokenResolvers.push(tokenResolver);
    });
  }

  /**
   * Enregistre l'appareil pour recevoir des notifications
   * À appeler APRÈS l'acceptation des permissions
   */
  async registerDevice(): Promise<boolean> {
    try {
      logger.info("📱 Enregistrement de l'appareil...");
      
      // Enregistrer l'appareil
      await PushNotifications.register();
      logger.info("✅ Demande d'enregistrement envoyée");

      // Attendre le token avec timeout de 10 secondes
      const token = await this.waitForToken(10000);
      if (!token) {
        logger.error("❌ Token non reçu dans le délai imparti");
        return false;
      }

      logger.success("✅ Token reçu:", token);

      // Vérifier que OneSignal a bien été enregistré
      if (!this.oneSignalPlayerId) {
        logger.warn("⚠️ OneSignal Player ID non disponible, nouvelle tentative...");
        await this.registerDeviceWithOneSignal(token);
        
        if (!this.oneSignalPlayerId) {
          logger.error("❌ Échec de l'enregistrement sur OneSignal");
          return false;
        }
      }

      logger.success("✅ Appareil enregistré avec succès");
      return true;
    } catch (error) {
      logger.error("❌ Erreur lors de l'enregistrement de l'appareil:", error);
      return false;
    }
  }

  /**
   * Récupère le token de l'appareil
   */
  async getDeviceToken(): Promise<string | null> {
    return this.deviceToken;
  }

  /**
   * Récupère l'ID OneSignal Player
   */
  async getOneSignalPlayerId(): Promise<string | null> {
    return this.oneSignalPlayerId;
  }

  /**
   * Récupère les informations de l'appareil
   */
  async getDeviceInfo(): Promise<DeviceInfo> {
    return {
      deviceToken: this.deviceToken,
      oneSignalPlayerId: this.oneSignalPlayerId,
      platform: this.getPlatform()
    };
  }

  /**
   * Enregistre l'appareil sur OneSignal via l'API REST
   */
  async registerDeviceWithOneSignal(deviceToken: string): Promise<string | null> {
    try {
      // Récupérer l'App ID OneSignal depuis les secrets Supabase
      const { data: secrets } = await supabase.functions.invoke('get-onesignal-config');
      const oneSignalAppId = secrets?.appId;

      if (!oneSignalAppId) {
        logger.error("❌ ONESIGNAL_APP_ID non configuré");
        return null;
      }

      const platform = this.getPlatform();
      const deviceType = platform === 'ios' ? 0 : platform === 'android' ? 1 : 5; // 0=iOS, 1=Android, 5=Web

      // Enregistrer l'appareil sur OneSignal
      const response = await fetch('https://onesignal.com/api/v1/players', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          app_id: oneSignalAppId,
          device_type: deviceType,
          identifier: deviceToken,
          language: navigator.language || 'fr',
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 0,
          game_version: '1.0.0',
          device_model: navigator.userAgent,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        logger.error("❌ Erreur OneSignal API:", error);
        return null;
      }

      const data = await response.json();
      this.oneSignalPlayerId = data.id;
      
      logger.success("✅ Appareil enregistré sur OneSignal:", data.id);
      return data.id;
    } catch (error) {
      logger.error("❌ Erreur lors de l'enregistrement sur OneSignal:", error);
      return null;
    }
  }

  /**
   * Sauvegarde les informations de l'appareil dans la base de données
   */
  async saveDeviceInfo(userId: string, deviceToken: string, oneSignalPlayerId: string): Promise<boolean> {
    try {
      const platform = this.getPlatform();

      const { error } = await supabase
        .from('profiles')
        .update({
          onesignal_player_id: oneSignalPlayerId,
          device_platform: platform,
          device_token: deviceToken,
        })
        .eq('id', userId);

      if (error) {
        logger.error("❌ Erreur lors de la sauvegarde des infos de l'appareil:", error);
        return false;
      }

      logger.success("✅ Informations de l'appareil sauvegardées");
      return true;
    } catch (error) {
      logger.error("❌ Erreur lors de la sauvegarde:", error);
      return false;
    }
  }

  /**
   * Supprime les informations de l'appareil de la base de données
   */
  async clearDeviceInfo(userId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          onesignal_player_id: null,
          device_platform: null,
          device_token: null,
        })
        .eq('id', userId);

      if (error) {
        logger.error("❌ Erreur lors de la suppression des infos de l'appareil:", error);
        return false;
      }

      this.deviceToken = null;
      this.oneSignalPlayerId = null;

      logger.success("✅ Informations de l'appareil supprimées");
      return true;
    } catch (error) {
      logger.error("❌ Erreur lors de la suppression:", error);
      return false;
    }
  }

  /**
   * Envoie une notification via l'edge function
   */
  async sendNotification(params: SendNotificationParams): Promise<boolean> {
    try {
      const { data, error } = await supabase.functions.invoke('send-push-notification', {
        body: params
      });

      if (error) {
        logger.error("❌ Erreur lors de l'envoi de la notification:", error);
        return false;
      }

      logger.success("✅ Notification envoyée avec succès:", data);
      return true;
    } catch (error) {
      logger.error("❌ Erreur lors de l'envoi de la notification:", error);
      return false;
    }
  }

  /**
   * Envoie un rappel de lecture
   */
  async sendReadingReminder(userId: string): Promise<boolean> {
    return this.sendNotification({
      userId,
      title: "📖 Temps de lecture !",
      message: "N'oubliez pas votre lecture du jour"
    });
  }

  /**
   * Envoie le verset du jour
   */
  async sendDailyVerse(userId: string, verse: { reference: string; text: string }): Promise<boolean> {
    return this.sendNotification({
      userId,
      title: `📖 ${verse.reference}`,
      message: verse.text
    });
  }

  /**
   * Envoie un encouragement pour un badge
   */
  async sendBadgeEncouragement(userId: string, badgeName: string): Promise<boolean> {
    return this.sendNotification({
      userId,
      title: "🏆 Nouveau badge débloqué !",
      message: `Félicitations ! Vous avez obtenu le badge "${badgeName}"`
    });
  }

  /**
   * Nettoie les listeners (à appeler lors du démontage du composant)
   */
  async cleanup(): Promise<void> {
    if (this.isNativePlatform()) {
      await PushNotifications.removeAllListeners();
    }
  }
}

export const capacitorNotificationService = new CapacitorNotificationService();
