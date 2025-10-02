import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface PushSubscriptionData {
  endpoint: string;
  p256dh: string;
  auth: string;
}

export interface NotificationPreferences {
  reading_reminder_enabled?: boolean;
  reading_reminder_time?: string;
  daily_verse_enabled?: boolean;
  daily_verse_time?: string;
  badge_encouragement_enabled?: boolean;
}

/**
 * Service pour gérer les abonnements push notifications avec Supabase
 */
class PushNotificationService {
  /**
   * Sauvegarder un abonnement push en base
   */
  async saveSubscription(subscriptionData: PushSubscriptionData): Promise<boolean> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('Utilisateur non authentifié');
      }

      // Désactiver les anciens abonnements pour cet utilisateur
      await supabase
        .from('push_subscriptions')
        .update({ is_active: false })
        .eq('user_id', user.id);

      // Insérer le nouvel abonnement
      const { error } = await supabase
        .from('push_subscriptions')
        .insert({
          user_id: user.id,
          endpoint: subscriptionData.endpoint,
          p256dh_key: subscriptionData.p256dh,
          auth_key: subscriptionData.auth,
          is_active: true
        });

      if (error) {
        console.error('Erreur lors de la sauvegarde de l\'abonnement:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Erreur dans saveSubscription:', error);
      return false;
    }
  }

  /**
   * Supprimer un abonnement push
   */
  async removeSubscription(endpoint: string): Promise<boolean> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('Utilisateur non authentifié');
      }

      const { error } = await supabase
        .from('push_subscriptions')
        .update({ is_active: false })
        .eq('user_id', user.id)
        .eq('endpoint', endpoint);

      if (error) {
        console.error('Erreur lors de la suppression de l\'abonnement:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Erreur dans removeSubscription:', error);
      return false;
    }
  }

  /**
   * Récupérer les préférences de notifications de l'utilisateur
   */
  async getNotificationPreferences() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        return null;
      }

      const { data, error } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
        console.error('Erreur lors de la récupération des préférences:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Erreur dans getNotificationPreferences:', error);
      return null;
    }
  }

  /**
   * Mettre à jour les préférences de notifications
   */
  async updateNotificationPreferences(preferences: NotificationPreferences): Promise<boolean> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('Utilisateur non authentifié');
      }

      // Vérifier si les préférences existent déjà
      const existing = await this.getNotificationPreferences();

      if (existing) {
        // Mettre à jour
        const { error } = await supabase
          .from('notification_preferences')
          .update({
            ...preferences,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', user.id);

        if (error) {
          console.error('Erreur lors de la mise à jour des préférences:', error);
          return false;
        }
      } else {
        // Créer
        const { error } = await supabase
          .from('notification_preferences')
          .insert({
            user_id: user.id,
            ...preferences
          });

        if (error) {
          console.error('Erreur lors de la création des préférences:', error);
          return false;
        }
      }

      return true;
    } catch (error) {
      console.error('Erreur dans updateNotificationPreferences:', error);
      return false;
    }
  }

  /**
   * Vérifier si l'utilisateur a un abonnement actif
   * Utilise une fonction sécurisée qui ne retourne pas les clés sensibles
   */
  async hasActiveSubscription(): Promise<boolean> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        return false;
      }

      // Utiliser la fonction sécurisée au lieu d'une requête directe
      const { data, error } = await supabase.rpc('get_user_push_subscription_status');

      if (error) {
        console.error('Erreur lors de la vérification de l\'abonnement:', error);
        return false;
      }

      return data && data.length > 0 && data[0]?.is_active === true;
    } catch (error) {
      console.error('Erreur dans hasActiveSubscription:', error);
      return false;
    }
  }
}

export const pushNotificationService = new PushNotificationService();