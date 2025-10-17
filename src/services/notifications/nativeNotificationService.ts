/**
 * Service de notifications simplifié (version mock)
 * Les notifications ne sont pas encore configurées
 */

import { logger } from "@/utils/logger";
import { toast } from "sonner";

interface NativePushSubscription {
  token: string;
  platform: 'android' | 'ios' | 'web';
}

class NativeNotificationService {
  /**
   * Vérifie si les notifications sont supportées
   */
  isSupported(): boolean {
    logger.info("📵 Notifications non configurées");
    return false;
  }

  /**
   * Demande la permission pour les notifications
   */
  async requestPermission(): Promise<boolean> {
    logger.info("📵 Notifications non configurées - permission non demandée");
    toast.info("Les notifications ne sont pas encore configurées");
    return false;
  }

  /**
   * Enregistre l'appareil pour les notifications
   */
  async register(): Promise<NativePushSubscription | null> {
    logger.info("📵 Notifications non configurées - pas d'enregistrement");
    return null;
  }

  /**
   * Sauvegarde le token (non implémenté)
   */
  async saveToken(subscription: NativePushSubscription): Promise<boolean> {
    logger.info("📵 Notifications non configurées - token non sauvegardé");
    return false;
  }

  /**
   * Configure les listeners (non implémenté)
   */
  setupListeners(
    onNotificationReceived?: (notification: any) => void,
    onNotificationAction?: (action: any) => void
  ): void {
    logger.info("📵 Notifications non configurées - pas de listeners");
  }

  /**
   * Supprime le token (non implémenté)
   */
  async removeToken(): Promise<boolean> {
    logger.info("📵 Notifications non configurées - pas de token à supprimer");
    return false;
  }

  /**
   * Vérifie s'il existe un token actif
   */
  async hasActiveToken(): Promise<boolean> {
    return false;
  }
}

export const nativeNotificationService = new NativeNotificationService();
