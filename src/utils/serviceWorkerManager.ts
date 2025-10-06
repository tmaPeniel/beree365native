/**
 * Gestion du Service Worker
 */

import { logger } from './logger';

export class ServiceWorkerManager {
  static async getRegistration(): Promise<ServiceWorkerRegistration | null> {
    if (!('serviceWorker' in navigator)) {
      logger.warn('Service Worker not supported');
      return null;
    }

    try {
      const registration = await navigator.serviceWorker.getRegistration();
      return registration || null;
    } catch (error) {
      logger.error('Failed to get Service Worker registration', error);
      return null;
    }
  }

  static async getCurrentSubscription(): Promise<PushSubscription | null> {
    const registration = await this.getRegistration();
    if (!registration) return null;

    try {
      return await registration.pushManager.getSubscription();
    } catch (error) {
      logger.error('Failed to get push subscription', error);
      return null;
    }
  }

  static isSupported(): boolean {
    return (
      'serviceWorker' in navigator &&
      'PushManager' in window &&
      'Notification' in window
    );
  }
}
