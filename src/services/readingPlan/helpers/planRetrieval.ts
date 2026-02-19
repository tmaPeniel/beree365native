/**
 * Helpers pour récupérer les plans de lecture
 */

import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

export async function getUserSelectedPlanId(userId: string): Promise<string | null> {
  try {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('selected_plan_id')
      .eq('id', userId)
      .maybeSingle();
    
    if (error) {
      logger.error('Failed to get user plan', error);
      return null;
    }
    
    return profile?.selected_plan_id || null;
  } catch (error) {
    logger.error('Get user plan error', error);
    return null;
  }
}

export async function getChaptersForDay(dayNumber: number, planId: string) {
  try {
    const { data, error } = await supabase
      .from('reading_plan_chapters')
      .select('*')
      .eq('day_number', dayNumber)
      .eq('plan_id', planId)
      .order('sort_order');
    
    if (error) {
      logger.error(`Failed to get chapters for day ${dayNumber}`, error);
      return [];
    }
    
    return data || [];
  } catch (error) {
    logger.error('Get chapters error', error);
    return [];
  }
}
