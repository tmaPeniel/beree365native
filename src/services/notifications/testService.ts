/**
 * Service de test de notifications
 */

import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { logger } from '@/utils/logger';
import { errorHandler, ErrorCode } from '@/utils/errorHandler';

export class NotificationTestService {
  async sendTest(): Promise<boolean> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw errorHandler.create(ErrorCode.AUTH_REQUIRED, 'Vous devez être connecté');
      }

      logger.info('Sending test notification...');

      const { data, error } = await supabase.functions.invoke('test-push-notification', {
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (error) {
        logger.error('Test notification failed', error);
        toast.error('Erreur lors du test: ' + error.message);
        return false;
      }

      logger.success('Test notification sent', data);
      toast.success('Notification de test envoyée ! Vérifiez vos notifications.');
      return true;
    } catch (error) {
      logger.error('Test notification error', error);
      errorHandler.handle(error as Error);
      return false;
    }
  }
}

export const notificationTestService = new NotificationTestService();
