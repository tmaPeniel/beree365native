/**
 * Service de test de notifications
 */

import { toast } from 'sonner';
import { logger } from '@/utils/logger';
import { errorHandler, ErrorCode } from '@/utils/errorHandler';
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { LocalNotifications } from '@capacitor/local-notifications';
import { isFirebaseConfigured } from '@/config/firebase';

export class NotificationTestService {
  /**
   * Envoie une notification de test native (iOS/Android)
   */
  private async sendNativeTest(): Promise<boolean> {
    try {
      logger.info('Sending native test notification...');

      // Vérifier les permissions
      const permission = await PushNotifications.checkPermissions();
      if (permission.receive !== 'granted') {
        toast.info('Permissions de notification requises. Activez-les d\'abord.');
        return false;
      }

      // Planifier une notification locale de test
      await LocalNotifications.schedule({
        notifications: [
          {
            title: '🔔 Notification de test',
            body: 'Si vous voyez ceci, les notifications Capacitor fonctionnent !',
            id: 1,
            schedule: { at: new Date(Date.now() + 1000) } // Dans 1 seconde
          }
        ]
      });

      logger.success('Native test notification scheduled');
      toast.success('Notification de test envoyée ! Vérifiez vos notifications dans 1 seconde.');
      return true;
    } catch (error) {
      logger.error('Native test notification error', error);
      toast.error('Erreur lors de l\'envoi de la notification native');
      return false;
    }
  }

  /**
   * Envoie une notification de test web (PWA)
   */
  private async sendWebTest(): Promise<boolean> {
    try {
      logger.info('Sending web test notification...');

      // Vérifier que Firebase est configuré
      if (!isFirebaseConfigured()) {
        toast.error('Firebase n\'est pas configuré. Consultez FIREBASE_WEB_SETUP.md');
        return false;
      }

      // Vérifier les permissions
      if (Notification.permission !== 'granted') {
        toast.info('Permissions de notification requises. Activez-les d\'abord.');
        return false;
      }

      // Créer une notification de test via l'API du navigateur
      new Notification('🔔 Notification de test', {
        body: 'Si vous voyez ceci, les notifications web fonctionnent !',
        icon: '/beree-192x192.png',
        badge: '/beree-192x192.png',
        tag: 'test-notification'
      });

      logger.success('Web test notification sent');
      toast.success('Notification de test envoyée ! Vérifiez vos notifications.');
      return true;
    } catch (error) {
      logger.error('Web test notification error', error);
      toast.error('Erreur lors de l\'envoi de la notification web');
      return false;
    }
  }

  /**
   * Envoie une notification de test selon la plateforme
   */
  async sendTest(): Promise<boolean> {
    try {
      const isNative = Capacitor.isNativePlatform();
      
      logger.info(`Platform: ${isNative ? 'Native' : 'Web'}`);
      
      if (isNative) {
        return await this.sendNativeTest();
      } else {
        return await this.sendWebTest();
      }
    } catch (error) {
      logger.error('Test notification error', error);
      errorHandler.handle(error as Error);
      return false;
    }
  }
}

export const notificationTestService = new NotificationTestService();
