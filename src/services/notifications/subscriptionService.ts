/**
 * Service de gestion des abonnements push
 */

import { supabase } from '@/integrations/supabase/client';
import { PushSubscriptionData } from '@/types/notifications';
import { logger } from '@/utils/logger';
import { errorHandler, ErrorCode } from '@/utils/errorHandler';

export class SubscriptionService {
  async save(subscriptionData: PushSubscriptionData): Promise<boolean> {
    try {
      logger.info('Saving subscription to database...', {
        endpoint: subscriptionData.endpoint.substring(0, 50) + '...',
        hasP256dh: !!subscriptionData.p256dh,
        hasAuth: !!subscriptionData.auth
      });
      
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw errorHandler.create(ErrorCode.AUTH_REQUIRED, 'Utilisateur non authentifié');
      }

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
        logger.error('Failed to save subscription to database', error);
        return false;
      }

      logger.success('Subscription saved to database successfully');
      return true;
    } catch (error) {
      logger.error('Save subscription error', error);
      return false;
    }
  }

  async remove(endpoint: string): Promise<boolean> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw errorHandler.create(ErrorCode.AUTH_REQUIRED, 'Utilisateur non authentifié');
      }

      const { error } = await supabase
        .from('push_subscriptions')
        .update({ is_active: false })
        .eq('user_id', user.id)
        .eq('endpoint', endpoint);

      if (error) {
        logger.error('Failed to remove subscription', error);
        return false;
      }

      logger.success('Subscription removed');
      return true;
    } catch (error) {
      logger.error('Remove subscription error', error);
      return false;
    }
  }

  async hasActive(): Promise<boolean> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        return false;
      }

      const { data, error } = await supabase.rpc('get_user_push_subscription_status');

      if (error) {
        logger.error('Failed to check subscription status', error);
        return false;
      }

      return Array.isArray(data) && data.length > 0 && data[0]?.is_active === true;
    } catch (error) {
      logger.error('Has active subscription error', error);
      return false;
    }
  }
}

export const subscriptionService = new SubscriptionService();
