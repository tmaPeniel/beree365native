/**
 * Service de notifications push avec Despia et OneSignal
 */

import despia from 'despia-native';
import { logger } from "@/utils/logger";
import { supabase } from "@/integrations/supabase/client";

export interface SendNotificationParams {
  title: string;
  message: string;
  userId?: string;
  userIds?: string[];
}

class DespiaNotificationService {
  /**
   * Récupère l'ID du joueur OneSignal depuis Despia
   */
  getPlayerID(): string | null {
    try {
      const playerId = despia.onesignalplayerid;
      if (playerId) {
        logger.info("✅ OneSignal Player ID récupéré:", playerId);
        return playerId;
      }
      logger.warn("⚠️ Aucun Player ID OneSignal trouvé");
      return null;
    } catch (error) {
      logger.error("❌ Erreur lors de la récupération du Player ID:", error);
      return null;
    }
  }

  /**
   * Sauvegarde le Player ID dans la base de données
   */
  async savePlayerID(userId: string, playerId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ onesignal_player_id: playerId })
        .eq('id', userId);

      if (error) {
        logger.error("❌ Erreur lors de la sauvegarde du Player ID:", error);
        return false;
      }

      logger.success("✅ Player ID sauvegardé avec succès");
      return true;
    } catch (error) {
      logger.error("❌ Erreur lors de la sauvegarde du Player ID:", error);
      return false;
    }
  }

  /**
   * Envoie une notification push via l'API backend
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
   * Envoie un encouragement badge
   */
  async sendBadgeEncouragement(userId: string, badgeName: string): Promise<boolean> {
    return this.sendNotification({
      userId,
      title: "🏆 Nouveau badge débloqué !",
      message: `Félicitations ! Vous avez obtenu le badge "${badgeName}"`
    });
  }
}

export const despiaNotificationService = new DespiaNotificationService();
