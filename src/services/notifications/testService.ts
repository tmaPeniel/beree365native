/**
 * Service de test de notifications (version mock)
 * Les notifications ne sont pas encore configurées
 */

import { logger } from "@/utils/logger";
import { toast } from "sonner";

class NotificationTestService {
  /**
   * Envoie une notification de test (non implémenté)
   */
  async sendTest(): Promise<boolean> {
    logger.info("📵 Notifications non configurées - test impossible");
    toast.info("Les notifications ne sont pas encore configurées");
    return false;
  }
}

export const notificationTestService = new NotificationTestService();
