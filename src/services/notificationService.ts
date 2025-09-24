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
 * Service pour envoyer des notifications push via l'Edge Function
 */
class NotificationService {
  /**
   * Envoyer une notification push via l'Edge Function
   */
  async sendPushNotification(request: SendNotificationRequest): Promise<boolean> {
    try {
      const { data, error } = await supabase.functions.invoke('send-push-notification', {
        body: request
      });

      if (error) {
        console.error('Erreur lors de l\'envoi de la notification:', error);
        toast.error('Erreur lors de l\'envoi de la notification');
        return false;
      }

      console.log('Notification envoyée avec succès:', data);
      return true;
    } catch (error) {
      console.error('Erreur dans sendPushNotification:', error);
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