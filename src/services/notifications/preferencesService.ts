/**
 * Service de gestion des préférences de notifications
 */

import { supabase } from '@/integrations/supabase/client';
import { NotificationPreferences } from '@/types/notifications';
import { DEFAULT_NOTIFICATION_PREFS } from '@/constants/notifications';
import { logger } from '@/utils/logger';
import { errorHandler, ErrorCode } from '@/utils/errorHandler';

export class PreferencesService {
  async get(): Promise<NotificationPreferences> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        return DEFAULT_NOTIFICATION_PREFS;
      }

      const { data, error } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        logger.error('Failed to get preferences', error);
        return DEFAULT_NOTIFICATION_PREFS;
      }

      return data || DEFAULT_NOTIFICATION_PREFS;
    } catch (error) {
      logger.error('Get preferences error', error);
      return DEFAULT_NOTIFICATION_PREFS;
    }
  }

  async update(preferences: NotificationPreferences): Promise<boolean> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw errorHandler.create(ErrorCode.AUTH_REQUIRED, 'Utilisateur non authentifié');
      }

      const existing = await this.get();

      if (existing) {
        const { error } = await supabase
          .from('notification_preferences')
          .update({
            ...preferences,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', user.id);

        if (error) {
          logger.error('Failed to update preferences', error);
          return false;
        }
      } else {
        const { error } = await supabase
          .from('notification_preferences')
          .insert({
            user_id: user.id,
            ...preferences
          });

        if (error) {
          logger.error('Failed to create preferences', error);
          return false;
        }
      }

      logger.success('Preferences updated');
      return true;
    } catch (error) {
      logger.error('Update preferences error', error);
      return false;
    }
  }
}

export const preferencesService = new PreferencesService();
