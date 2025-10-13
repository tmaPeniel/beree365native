/**
 * Service de débogage pour les notifications
 */

import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

export interface NotificationDebugInfo {
  platform: 'native' | 'web' | 'unknown';
  hasSubscription: boolean;
  endpointType: string;
  endpointPreview: string;
  isActive: boolean;
  createdAt?: string;
  latestLogs: Array<{
    id: string;
    type: string;
    title: string;
    success: boolean;
    sent_at: string;
    error_message?: string;
  }>;
}

class NotificationDebugService {
  async getDebugInfo(): Promise<NotificationDebugInfo | null> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        logger.warn('No session for debug info');
        return null;
      }

      // Récupérer l'abonnement actuel
      const { data: subscription } = await supabase
        .from('push_subscriptions')
        .select('*')
        .eq('user_id', session.user.id)
        .eq('is_active', true)
        .maybeSingle();

      // Récupérer les derniers logs
      const { data: logs } = await supabase
        .from('notification_logs')
        .select('id, notification_type, title, success, sent_at, error_message')
        .eq('user_id', session.user.id)
        .order('sent_at', { ascending: false })
        .limit(10);

      let platform: 'native' | 'web' | 'unknown' = 'unknown';
      let endpointType = 'Aucun';
      let endpointPreview = 'Aucun abonnement actif';

      if (subscription) {
        const endpoint = subscription.endpoint;
        endpointPreview = endpoint.substring(0, 60) + '...';

        if (endpoint.startsWith('android:') || endpoint.includes('fcm.googleapis.com')) {
          platform = 'native';
          endpointType = 'Android FCM';
        } else if (endpoint.startsWith('https://')) {
          platform = 'web';
          endpointType = 'Web Push';
        }
      }

      return {
        platform,
        hasSubscription: !!subscription,
        endpointType,
        endpointPreview,
        isActive: subscription?.is_active || false,
        createdAt: subscription?.created_at,
        latestLogs: logs?.map(log => ({
          id: log.id,
          type: log.notification_type,
          title: log.title,
          success: log.success,
          sent_at: log.sent_at,
          error_message: log.error_message
        })) || []
      };
    } catch (error) {
      logger.error('Failed to get debug info', error);
      return null;
    }
  }

  async testNotification(): Promise<boolean> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('Vous devez être connecté');
      }

      logger.info('Testing notification...');

      const { error } = await supabase.functions.invoke('test-push-notification', {
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (error) {
        logger.error('Test failed', error);
        return false;
      }

      logger.success('Test notification sent');
      return true;
    } catch (error) {
      logger.error('Test error', error);
      return false;
    }
  }
}

export const notificationDebugService = new NotificationDebugService();
