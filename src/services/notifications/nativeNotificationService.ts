/**
 * Service de notifications push unifié (Capacitor + Firebase)
 * Supporte native (iOS/Android) et web via Firebase Cloud Messaging
 */

import { PushNotifications, PushNotificationSchema, Token } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';
import { getToken, onMessage } from 'firebase/messaging';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';
import { errorHandler, ErrorCode } from '@/utils/errorHandler';
import { toast } from 'sonner';
import { getFirebaseMessaging, isFirebaseConfigured } from '@/config/firebase';

export interface NativePushSubscription {
  token: string;
  platform: 'ios' | 'android' | 'web';
}

export class NativeNotificationService {
  private isNative = Capacitor.isNativePlatform();

  /**
   * Vérifie si les notifications sont supportées (native ou web)
   */
  isSupported(): boolean {
    // Native
    if (this.isNative) {
      return true;
    }
    
    // Web via Firebase
    return isFirebaseConfigured() && 
           'Notification' in window && 
           'serviceWorker' in navigator;
  }

  /**
   * Demande la permission pour les notifications (native ou web)
   */
  async requestPermission(): Promise<boolean> {
    try {
      // Native
      if (this.isNative) {
        const result = await PushNotifications.requestPermissions();
        
        if (result.receive === 'granted') {
          logger.success('Native notification permission granted');
          return true;
        } else {
          logger.warn('Native notification permission denied');
          toast.error('Permission refusée pour les notifications');
          return false;
        }
      }

      // Web
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        logger.success('Web notification permission granted');
        return true;
      } else {
        logger.warn('Web notification permission denied');
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
   * Enregistre l'appareil pour les notifications push (native ou web)
   */
  async register(): Promise<NativePushSubscription | null> {
    try {
      // Demander la permission d'abord
      const hasPermission = await this.requestPermission();
      if (!hasPermission) {
        return null;
      }

      // Native (iOS/Android)
      if (this.isNative) {
        await PushNotifications.register();
        
        return new Promise((resolve) => {
          PushNotifications.addListener('registration', (token: Token) => {
            logger.success('Native push registration success', { token: token.value });
            
            const platform = Capacitor.getPlatform() as 'ios' | 'android';
            resolve({
              token: token.value,
              platform
            });
          });

          PushNotifications.addListener('registrationError', (error: any) => {
            logger.error('Native push registration error', error);
            toast.error('Erreur lors de l\'enregistrement des notifications');
            resolve(null);
          });
        });
      }

      // Web via Firebase Cloud Messaging
      const messaging = await getFirebaseMessaging();
      if (!messaging) {
        toast.error('Firebase non configuré. Consultez la documentation.');
        return null;
      }

      // Enregistrer le Service Worker Firebase
      const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
      logger.debug('Firebase Service Worker registered');

      // Obtenir le token FCM
      // IMPORTANT: Remplacez "VOTRE_VAPID_KEY" par votre vraie clé VAPID depuis Firebase Console
      const token = await getToken(messaging, {
        vapidKey: 'VOTRE_VAPID_KEY',
        serviceWorkerRegistration: registration
      });

      if (!token) {
        logger.error('No FCM token received');
        toast.error('Erreur lors de l\'obtention du token de notification');
        return null;
      }

      logger.success('Web push registration success via Firebase', { 
        token: token.substring(0, 20) + '...' 
      });

      return {
        token,
        platform: 'web'
      };
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
   * Configure les listeners pour les notifications (native ou web)
   */
  async setupListeners(
    onNotificationReceived?: (notification: PushNotificationSchema) => void,
    onNotificationAction?: (notification: PushNotificationSchema) => void
  ) {
    // Native
    if (this.isNative) {
      PushNotifications.addListener('pushNotificationReceived', (notification) => {
        logger.info('Native notification received', notification);
        if (onNotificationReceived) {
          onNotificationReceived(notification);
        }
      });

      PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
        logger.info('Native notification action', action);
        if (onNotificationAction) {
          onNotificationAction(action.notification);
        }
      });
      return;
    }

    // Web via Firebase
    const messaging = await getFirebaseMessaging();
    if (!messaging) {
      logger.warn('Cannot setup listeners: Firebase not configured');
      return;
    }

    // Écouter les messages en foreground
    onMessage(messaging, (payload) => {
      logger.info('Web notification received via Firebase', payload);
      
      // Convertir le format Firebase en format Capacitor
      const notification: PushNotificationSchema = {
        id: Date.now().toString(),
        title: payload.notification?.title || '',
        body: payload.notification?.body || '',
        data: payload.data || {}
      };
      
      if (onNotificationReceived) {
        onNotificationReceived(notification);
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
