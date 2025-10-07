/**
 * Service de notifications push natives (Capacitor)
 */

import { PushNotifications, PushNotificationSchema, Token } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';
import { errorHandler, ErrorCode } from '@/utils/errorHandler';
import { toast } from 'sonner';

export interface NativePushSubscription {
  token: string;
  platform: 'ios' | 'android' | 'web';
}

export class NativeNotificationService {
  private isNative = Capacitor.isNativePlatform();

  /**
   * Vérifie si les notifications natives sont supportées
   */
  isSupported(): boolean {
    return this.isNative;
  }

  /**
   * Demande la permission pour les notifications
   */
  async requestPermission(): Promise<boolean> {
    if (!this.isNative) {
      logger.warn('Native notifications not supported on web');
      return false;
    }

    try {
      const result = await PushNotifications.requestPermissions();
      
      if (result.receive === 'granted') {
        logger.success('Push notification permission granted');
        return true;
      } else {
        logger.warn('Push notification permission denied');
        toast.error('Permission refusée pour les notifications');
        return false;
      }
    } catch (error) {
      logger.error('Failed to request permission', error);
      errorHandler.handle(error as Error);
      return false;
    }
  }

  /**
   * Enregistre l'appareil pour les notifications push
   */
  async register(): Promise<NativePushSubscription | null> {
    if (!this.isNative) {
      return null;
    }

    try {
      // Demander la permission d'abord
      const hasPermission = await this.requestPermission();
      if (!hasPermission) {
        return null;
      }

      // Enregistrer l'appareil
      await PushNotifications.register();
      
      return new Promise((resolve) => {
        // Attendre le token
        PushNotifications.addListener('registration', (token: Token) => {
          logger.success('Push registration success', { token: token.value });
          
          const platform = Capacitor.getPlatform() as 'ios' | 'android';
          resolve({
            token: token.value,
            platform
          });
        });

        PushNotifications.addListener('registrationError', (error: any) => {
          logger.error('Push registration error', error);
          toast.error('Erreur lors de l\'enregistrement des notifications');
          resolve(null);
        });
      });
    } catch (error) {
      logger.error('Failed to register for push', error);
      errorHandler.handle(error as Error);
      return null;
    }
  }

  /**
   * Sauvegarde le token sur le serveur
   */
  async saveToken(subscription: NativePushSubscription): Promise<boolean> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw errorHandler.create(ErrorCode.AUTH_REQUIRED, 'Utilisateur non authentifié');
      }

      // Désactiver les anciens tokens
      await supabase
        .from('push_subscriptions')
        .update({ is_active: false })
        .eq('user_id', session.user.id);

      // Insérer le nouveau token
      const { error } = await supabase
        .from('push_subscriptions')
        .insert([{
          user_id: session.user.id,
          endpoint: `${subscription.platform}:${subscription.token}`,
          p256dh_key: subscription.token,
          auth_key: subscription.platform,
          is_active: true
        }]);

      if (error) {
        throw error;
      }

      logger.success('Token saved to server');
      return true;
    } catch (error) {
      logger.error('Failed to save token', error);
      errorHandler.handle(error as Error);
      return false;
    }
  }

  /**
   * Configure les listeners pour les notifications
   */
  setupListeners(
    onNotificationReceived?: (notification: PushNotificationSchema) => void,
    onNotificationAction?: (notification: PushNotificationSchema) => void
  ) {
    if (!this.isNative) {
      return;
    }

    // Notification reçue en foreground
    PushNotifications.addListener('pushNotificationReceived', (notification) => {
      logger.info('Push notification received', notification);
      if (onNotificationReceived) {
        onNotificationReceived(notification);
      }
    });

    // Action sur la notification
    PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
      logger.info('Push notification action', action);
      if (onNotificationAction) {
        onNotificationAction(action.notification);
      }
    });
  }

  /**
   * Supprime le token du serveur
   */
  async removeToken(): Promise<boolean> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        return false;
      }

      const { error } = await supabase
        .from('push_subscriptions')
        .update({ is_active: false })
        .eq('user_id', session.user.id);

      if (error) {
        throw error;
      }

      logger.success('Token removed from server');
      return true;
    } catch (error) {
      logger.error('Failed to remove token', error);
      errorHandler.handle(error as Error);
      return false;
    }
  }

  /**
   * Vérifie si l'utilisateur a un token actif
   */
  async hasActiveToken(): Promise<boolean> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        return false;
      }

      const { data, error } = await supabase
        .from('push_subscriptions')
        .select('id')
        .eq('user_id', session.user.id)
        .eq('is_active', true)
        .single();

      return !error && !!data;
    } catch {
      return false;
    }
  }
}

export const nativeNotificationService = new NativeNotificationService();
