/**
 * Service de gestion des abonnements push (version mock)
 * Les notifications ne sont pas encore configurées
 */

import { logger } from "@/utils/logger";
import { PushSubscriptionData } from '@/types/notifications';

class SubscriptionService {
  /**
   * Sauvegarde un nouvel abonnement push (non implémenté)
   */
  async save(subscriptionData: PushSubscriptionData): Promise<boolean> {
    logger.info("📵 Notifications non configurées - abonnement non sauvegardé");
    return false;
  }

  /**
   * Désactive un abonnement push (non implémenté)
   */
  async remove(endpoint: string): Promise<boolean> {
    logger.info("📵 Notifications non configurées - abonnement non supprimé");
    return false;
  }

  /**
   * Vérifie si l'utilisateur a un abonnement actif
   */
  async hasActive(): Promise<boolean> {
    return false;
  }
}

export const subscriptionService = new SubscriptionService();
