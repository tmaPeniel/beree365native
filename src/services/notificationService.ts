/**
 * Service de notifications (version mock)
 * Les notifications ne sont pas encore configurées
 */

import { logger } from "@/utils/logger";

export interface SendNotificationRequest {
  userId?: string;
  userIds?: string[];
  title: string;
  body: string;
  data?: Record<string, any>;
}

class NotificationService {
  /**
   * Envoie une notification push (non implémenté)
   */
  async sendPushNotification(request: SendNotificationRequest): Promise<boolean> {
    logger.info("📵 Notifications non configurées - notification non envoyée", request);
    return false;
  }

  /**
   * Envoie un rappel de lecture (non implémenté)
   */
  async sendReadingReminder(userId: string): Promise<boolean> {
    logger.info("📵 Notifications non configurées - rappel non envoyé");
    return false;
  }

  /**
   * Envoie le verset du jour (non implémenté)
   */
  async sendDailyVerse(
    userId: string,
    verse: { reference: string; text: string }
  ): Promise<boolean> {
    logger.info("📵 Notifications non configurées - verset non envoyé");
    return false;
  }

  /**
   * Envoie un encouragement badge (non implémenté)
   */
  async sendBadgeEncouragement(userId: string, badgeName: string): Promise<boolean> {
    logger.info("📵 Notifications non configurées - encouragement non envoyé");
    return false;
  }

  /**
   * Envoie une notification générale (non implémenté)
   */
  async sendGeneralNotification(
    title: string,
    body: string,
    data?: any
  ): Promise<boolean> {
    logger.info("📵 Notifications non configurées - notification générale non envoyée");
    return false;
  }

  /**
   * Envoie une notification à des utilisateurs spécifiques (non implémenté)
   */
  async sendNotificationToUsers(
    userIds: string[],
    title: string,
    body: string,
    data?: any
  ): Promise<boolean> {
    logger.info("📵 Notifications non configurées - notification ciblée non envoyée");
    return false;
  }
}

export const notificationService = new NotificationService();
