import { supabase } from '@/integrations/supabase/client';

/**
 * Service pour gérer l'activité utilisateur
 */
export class ActivityService {
  private static lastUpdate: number = 0;
  private static readonly THROTTLE_DURATION = 5 * 60 * 1000; // 5 minutes

  /**
   * Met à jour l'activité de l'utilisateur (throttlé)
   */
  static async updateUserActivity(userId: string): Promise<void> {
    try {
      const now = Date.now();
      
      // Throttle les mises à jour (max une fois toutes les 5 minutes)
      if (now - this.lastUpdate < this.THROTTLE_DURATION) {
        return;
      }

      await supabase.rpc('update_user_activity', { p_user_id: userId });
      this.lastUpdate = now;
      
      console.log('User activity updated successfully');
    } catch (error) {
      console.error('Error updating user activity:', error);
    }
  }

  /**
   * Force la mise à jour d'activité (sans throttle)
   */
  static async forceUpdateUserActivity(userId: string): Promise<void> {
    try {
      await supabase.rpc('update_user_activity', { p_user_id: userId });
      this.lastUpdate = Date.now();
      
      console.log('User activity force updated successfully');
    } catch (error) {
      console.error('Error force updating user activity:', error);
    }
  }
}