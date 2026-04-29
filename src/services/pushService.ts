/**
 * Service de notifications push natif (Web Push API + VAPID)
 * Remplace OneSignal par une implémentation native
 */

import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY;

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export interface PushPermissionState {
  permission: NotificationPermission;
  isSubscribed: boolean;
}

class PushService {
  private registration: ServiceWorkerRegistration | null = null;

  /**
   * Récupère le service worker enregistré
   */
  private async getRegistration(): Promise<ServiceWorkerRegistration | null> {
    if (this.registration) return this.registration;
    try {
      this.registration = await navigator.serviceWorker.ready;
      return this.registration;
    } catch (error) {
      logger.error('❌ Service Worker non disponible:', error);
      return null;
    }
  }

  /**
   * Vérifie si l'utilisateur est abonné
   */
  async isSubscribed(): Promise<boolean> {
    try {
      const reg = await this.getRegistration();
      if (!reg) return false;
      const sub = await reg.pushManager.getSubscription();
      return !!sub;
    } catch {
      return false;
    }
  }

  /**
   * Récupère l'état actuel
   */
  async getPermissionState(): Promise<PushPermissionState> {
    const permission = 'Notification' in window ? Notification.permission : 'denied';
    const isSubscribed = await this.isSubscribed();
    return { permission, isSubscribed };
  }

  /**
   * Récupère l'endpoint courant (si abonné)
   */
  async getCurrentEndpoint(): Promise<string | null> {
    try {
      const reg = await this.getRegistration();
      if (!reg) return null;
      const sub = await reg.pushManager.getSubscription();
      return sub?.endpoint ?? null;
    } catch {
      return null;
    }
  }

  /**
   * Demande la permission et s'abonne aux notifications push
   */
  async subscribe(): Promise<boolean> {
    try {
      if (!VAPID_PUBLIC_KEY) {
        logger.error('❌ VAPID_PUBLIC_KEY manquante');
        return false;
      }

      logger.info('📝 Abonnement aux notifications push natives...');

      const reg = await this.getRegistration();
      if (!reg) {
        logger.error('❌ Service Worker non disponible');
        return false;
      }

      // Demander la permission si nécessaire
      if (Notification.permission === 'default') {
        const result = await Notification.requestPermission();
        if (result !== 'granted') {
          logger.warn('⚠️ Permission refusée');
          return false;
        }
      } else if (Notification.permission === 'denied') {
        logger.error('❌ Permission refusée par le navigateur');
        return false;
      }

      // Réutiliser une souscription existante si possible
      let subscription = await reg.pushManager.getSubscription();

      if (subscription) {
        logger.info('♻️ Souscription existante détectée, on la réutilise');
      } else {
        const applicationServerKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
        subscription = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: applicationServerKey.buffer as ArrayBuffer,
        });
        logger.success('✅ Nouvelle souscription push créée');
      }

      // Sauvegarder/réactiver dans Supabase
      await this.saveSubscription(subscription);

      return true;
    } catch (error) {
      logger.error('❌ Erreur lors de l\'abonnement:', error);
      return false;
    }
  }

  /**
   * Se désabonne des notifications push
   */
  async unsubscribe(): Promise<boolean> {
    try {
      logger.info('🔕 Désabonnement des notifications push...');

      const reg = await this.getRegistration();
      if (!reg) return true;

      const subscription = await reg.pushManager.getSubscription();
      if (subscription) {
        await subscription.unsubscribe();
      }

      // Marquer comme inactif dans Supabase
      await this.deactivateSubscription();

      logger.success('✅ Désabonné avec succès');
      return true;
    } catch (error) {
      logger.error('❌ Erreur lors du désabonnement:', error);
      return false;
    }
  }

  /**
   * Sauvegarde la souscription dans user_devices.
   * Stratégie : désactiver toutes les autres lignes web de l'utilisateur,
   * puis upsert/insert la souscription courante en active.
   */
  private async saveSubscription(subscription: PushSubscription): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      logger.warn('⚠️ Utilisateur non connecté');
      return;
    }

    const subJson = subscription.toJSON();
    const endpoint = subJson.endpoint || '';
    const p256dh = subJson.keys?.p256dh || '';
    const auth = subJson.keys?.auth || '';

    // 1) Désactiver toutes les anciennes souscriptions web de cet utilisateur
    //    pour qu'une seule souscription (le navigateur courant) soit active.
    const { error: deactivateError } = await supabase
      .from('user_devices')
      .update({ is_active: false })
      .eq('user_id', user.id)
      .eq('device_platform', 'web');

    if (deactivateError) {
      logger.warn('⚠️ Impossible de désactiver les anciens devices web:', deactivateError);
    }

    // 2) Si une ligne existe déjà pour cet endpoint, la réactiver et MAJ les clés
    const { data: existing } = await supabase
      .from('user_devices')
      .select('id')
      .eq('user_id', user.id)
      .eq('push_endpoint', endpoint)
      .maybeSingle();

    if (existing?.id) {
      const { error: updateError } = await supabase
        .from('user_devices')
        .update({
          push_p256dh: p256dh,
          push_auth: auth,
          device_platform: 'web',
          last_seen_at: new Date().toISOString(),
          is_active: true,
        })
        .eq('id', existing.id);

      if (updateError) {
        logger.error('❌ Erreur réactivation device existant:', updateError);
      } else {
        logger.success('✅ Souscription existante réactivée');
      }
      return;
    }

    // 3) Sinon, insérer une nouvelle ligne
    const { error: insertError } = await supabase
      .from('user_devices')
      .insert({
        user_id: user.id,
        push_endpoint: endpoint,
        push_p256dh: p256dh,
        push_auth: auth,
        device_platform: 'web',
        last_seen_at: new Date().toISOString(),
        is_active: true,
      });

    if (insertError) {
      logger.error('❌ Erreur insert nouvelle souscription:', insertError);
    } else {
      logger.success('✅ Nouvelle souscription enregistrée dans user_devices');
    }
  }

  /**
   * Désactive la souscription dans user_devices
   */
  private async deactivateSubscription(): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase
      .from('user_devices')
      .update({ is_active: false })
      .eq('user_id', user.id)
      .eq('device_platform', 'web');
  }

  /**
   * Envoie une notification push via l'edge function Supabase
   */
  async sendNotification(params: {
    title: string;
    message: string;
    userId?: string;
    userIds?: string[];
  }): Promise<boolean> {
    try {
      logger.info('📤 Envoi de notification push...', params);

      const { data, error } = await supabase.functions.invoke('send-push-notification', {
        body: params,
      });

      if (error) {
        logger.error('❌ Erreur envoi notification:', error);
        return false;
      }

      logger.success('✅ Notification envoyée:', data);
      return true;
    } catch (error) {
      logger.error('❌ Erreur envoi notification:', error);
      return false;
    }
  }
}

export const pushService = new PushService();
