/**
 * Service de gestion des chapitres - Version simplifiée
 */

import { ReadingPlanChapter } from "@/types/supabase";
import { getUserSelectedPlanId, getChaptersForDay } from './helpers/planRetrieval';
import { logger } from '@/utils/logger';

export const getReadingPlanForDay = async (dayNumber: number, userId: string): Promise<ReadingPlanChapter[]> => {
  try {
    const planId = await getUserSelectedPlanId(userId);
    if (!planId) {
      logger.debug('No plan selected');
      return [];
    }

    const chapters = await getChaptersForDay(dayNumber, planId);
    logger.debug(`Found ${chapters.length} chapters for day ${dayNumber}`);
    return chapters as ReadingPlanChapter[];
  } catch (error) {
    logger.error('Get reading plan error', error);
    return [];
  }
};

export const calculateDayNumber = (startDate: Date) => {
  const today = new Date();
  const start = new Date(startDate);
  
  today.setHours(0, 0, 0, 0);
  start.setHours(0, 0, 0, 0);
  
  const diffTime = today.getTime() - start.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  return Math.max(1, diffDays + 1);
};
