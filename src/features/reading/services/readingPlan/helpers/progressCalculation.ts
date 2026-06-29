/**
 * Helpers pour les calculs de progression
 */

import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/shared/utils/logger';

export async function getCompletedChaptersCount(userId: string, chapterIds: string[]): Promise<number> {
  try {
    const { data, error } = await supabase
      .from('user_progress')
      .select('*')
      .eq('user_id', userId)
      .in('chapter_id', chapterIds)
      .eq('status', 'completed');
    
    if (error) {
      logger.error('Failed to get completed chapters', error);
      return 0;
    }
    
    return data?.length || 0;
  } catch (error) {
    logger.error('Get completed chapters error', error);
    return 0;
  }
}

export function calculatePercentage(completed: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((completed / total) * 100);
}

export async function getCompletedDaysViaRPC(userId: string): Promise<number | null> {
  try {
    const { data, error } = await supabase.rpc('get_completed_days_count', {
      p_user_id: userId
    });
    
    if (error) {
      logger.debug('RPC function not available');
      return null;
    }
    
    return data || 0;
  } catch (error) {
    logger.debug('RPC call failed', error);
    return null;
  }
}
