import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface SendNotificationRequest {
  title: string;
  body: string;
  data?: any;
  tag?: string;
  icon?: string;
  badge?: string;
  image?: string;
  userId?: string;
  userIds?: string[];
}


/**
 * Service unifié pour envoyer des notifications push (Web + Native)
 */
class NotificationService {
  /**
   * Envoyer une notification push via les Edge Functions appropriées
   * Utilise FCM pour native et Web Push pour PWA
   */
  async sendPushNotification(request: SendNotificationRequest): Promise<boolean> {
    try {
      // Envoyer via les deux canaux (FCM pour native, Web Push pour web)
      // Les Edge Functions filtreront automatiquement les bons tokens
      
      const [fcmResult, webPushResult] = await Promise.allSettled([
        // FCM pour iOS/Android
        supabase.functions.invoke('send-fcm-notification', {
          body: request
        }),
        // Web Push pour PWA
        supabase.functions.invoke('send-push-notification', {
          body: request
        })
      ]);

      const fcmSuccess = fcmResult.status === 'fulfilled' && !fcmResult.value.error;
      const webPushSuccess = webPushResult.status === 'fulfilled' && !webPushResult.value.error;

      if (fcmSuccess || webPushSuccess) {
        console.log('✅ Notifications sent:', { 
          fcm: fcmSuccess, 
          webPush: webPushSuccess 
        });
        return true;
      }

      console.error('❌ Both notification methods failed:', { fcmResult, webPushResult });
      toast.error('Erreur lors de l\'envoi de la notification');
      return false;
    } catch (error) {
      console.error('❌ Error in sendPushNotification:', error);
      toast.error('Erreur lors de l\'envoi de la notification');
      return false;
    }
  }

  /**
   * Envoyer une notification de rappel de lecture à un utilisateur
   */
  async sendReadingReminder(userId: string): Promise<boolean> {
    return this.sendPushNotification({
      title: 'Rappel de lecture 📖',
      body: 'Il est temps de faire votre lecture quotidienne !',
      tag: 'reading_reminder',
      data: {
        type: 'reading_reminder',
        action: 'open_reading'
      },
      userId
    });
  }

  /**
   * Envoyer le verset du jour à un utilisateur
   */
  async sendDailyVerse(userId: string, verse: { reference: string; text: string }): Promise<boolean> {
    return this.sendPushNotification({
      title: `Verset du jour - ${verse.reference}`,
      body: verse.text.length > 100 ? verse.text.substring(0, 100) + '...' : verse.text,
      tag: 'daily_verse',
      data: {
        type: 'daily_verse',
        reference: verse.reference,
        text: verse.text
      },
      userId
    });
  }

  /**
   * Envoyer une notification d'encouragement pour un badge
   */
  async sendBadgeEncouragement(userId: string, badgeName: string): Promise<boolean> {
    return this.sendPushNotification({
      title: '🎉 Félicitations !',
      body: `Vous avez débloqué le badge "${badgeName}" !`,
      tag: 'badge_encouragement',
      data: {
        type: 'badge_encouragement',
        badge_name: badgeName,
        action: 'open_profile'
      },
      userId
    });
  }

  /**
   * Envoyer une notification générale à tous les utilisateurs
   */
  async sendGeneralNotification(title: string, body: string, data?: any): Promise<boolean> {
    return this.sendPushNotification({
      title,
      body,
      tag: 'general',
      data: {
        type: 'general',
        ...data
      }
    });
  }

  /**
   * Envoyer une notification à plusieurs utilisateurs spécifiques
   */
  async sendNotificationToUsers(userIds: string[], title: string, body: string, data?: any): Promise<boolean> {
    return this.sendPushNotification({
      title,
      body,
      tag: 'targeted',
      data: {
        type: 'targeted',
        ...data
      },
      userIds
    });
  }
}

export const notificationService = new NotificationService();