/**
 * Nettoyage des anciens abonnements push
 */

import { ServiceWorkerManager } from './serviceWorkerManager';
import { logger } from './logger';

export class PushSubscriptionCleaner {
  static async cleanupOldSubscription(onCleanup?: (endpoint: string) => Promise<boolean>): Promise<boolean> {
    try {
      const subscription = await ServiceWorkerManager.getCurrentSubscription();
      
      if (!subscription) {
        logger.debug('No existing subscription to clean');
        return true;
      }

      logger.info('Cleaning old subscription...');
      
      // Notifier le backend si une fonction est fournie
      if (onCleanup) {
        await onCleanup(subscription.endpoint);
      }

      // Désabonner localement
      await subscription.unsubscribe();
      logger.success('Old subscription cleaned');
      return true;

    } catch (error) {
      logger.warn('Cleanup failed (non-critical)', error);
      return false;
    }
  }
}
