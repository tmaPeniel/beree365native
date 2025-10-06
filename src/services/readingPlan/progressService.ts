/**
 * Service de progression - Version simplifiée
 */

import { supabase } from "@/integrations/supabase/client";
import { UserProgress, ReadingPlanChapter } from "@/types/supabase";
import { ProgressMetrics } from "@/types/progress";
import { toast } from "sonner";
import { ActivityService } from '../auth/activityService';
import { getUserSelectedPlanId, getChaptersForDay } from './helpers/planRetrieval';
import { getCompletedChaptersCount, calculatePercentage, getCompletedDaysViaRPC } from './helpers/progressCalculation';
import { logger } from '@/utils/logger';

export const getUserProgressForDay = async (userId: string, dayNumber: number) => {
  try {
    if (!userId) {
      logger.error("No user ID provided");
      return [];
    }
    
    const planId = await getUserSelectedPlanId(userId);
    if (!planId) {
      logger.debug("No selected plan found");
      return [];
    }
    
    const chapters = await getChaptersForDay(dayNumber, planId);
    if (chapters.length === 0) {
      logger.debug(`No chapters for day ${dayNumber}`);
      return [];
    }
    
    const chapterIds = chapters.map(c => c.id);
    const { data: progressData, error } = await supabase
      .from('user_progress')
      .select('*')
      .eq('user_id', userId)
      .in('chapter_id', chapterIds);
    
    if (error) {
      logger.error('Failed to fetch progress', error);
      return [];
    }
    
    return chapters.map(chapter => {
      const progressItem = progressData?.find(p => p.chapter_id === chapter.id);
      
      return {
        id: progressItem?.id || `temp-${chapter.id}`,
        user_id: userId,
        chapter_id: chapter.id,
        status: progressItem?.status || 'pending' as const,
        completed_at: progressItem?.completed_at || null,
        reading_plan_chapters: chapter
      };
    }) as (UserProgress & { reading_plan_chapters: ReadingPlanChapter })[];
  } catch (error) {
    logger.error('Get user progress error', error);
    return [];
  }
};

export const toggleChapterStatus = async (userId: string, chapterId: string, currentStatus: 'pending' | 'completed') => {
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session) {
    toast.error("Vous devez être connecté pour modifier le statut de lecture");
    return { success: false, error: "User not authenticated" };
  }
  
  const newStatus = currentStatus === 'pending' ? 'completed' : 'pending';
  const completedAt = newStatus === 'completed' ? new Date().toISOString() : null;
  
  try {
    const { data: existingEntries } = await supabase
      .from('user_progress')
      .select('*')
      .eq('user_id', userId)
      .eq('chapter_id', chapterId);
    
    let result;
    
    if (existingEntries && existingEntries.length > 0) {
      const { data, error } = await supabase
        .from('user_progress')
        .update({ status: newStatus, completed_at: completedAt })
        .eq('user_id', userId)
        .eq('chapter_id', chapterId)
        .select();
      
      if (error) throw error;
      result = { success: true, data };
    } else {
      const { data, error } = await supabase
        .from('user_progress')
        .insert([{ user_id: userId, chapter_id: chapterId, status: newStatus, completed_at: completedAt }])
        .select();
      
      if (error) throw error;
      result = { success: true, data };
    }
    
    await ActivityService.updateUserActivity(userId);
    toast.success(newStatus === 'completed' ? "Passage marqué comme lu" : "Passage marqué comme non lu");
    
    return result;
  } catch (error: any) {
    logger.error('Toggle status error', error);
    toast.error(`Une erreur est survenue: ${error.message}`);
    return { success: false, error: error.message };
  }
};

export const getDayProgress = async (userId: string, dayNumber: number) => {
  try {
    const planId = await getUserSelectedPlanId(userId);
    if (!planId) return 0;
    
    const chapters = await getChaptersForDay(dayNumber, planId);
    if (chapters.length === 0) return 0;
    
    const chapterIds = chapters.map(c => c.id);
    const completedCount = await getCompletedChaptersCount(userId, chapterIds);
    
    return calculatePercentage(completedCount, chapters.length);
  } catch (error) {
    logger.error('Get day progress error', error);
    return 0;
  }
};

export const getCompletedDaysCount = async (userId: string) => {
  try {
    // Essayer d'abord via RPC
    const rpcResult = await getCompletedDaysViaRPC(userId);
    if (rpcResult !== null) {
      return rpcResult;
    }
    
    // Fallback: calcul manuel
    return await getCompletedDaysCountFallback(userId);
  } catch (error) {
    logger.error('Get completed days error', error);
    return 0;
  }
};

const getCompletedDaysCountFallback = async (userId: string): Promise<number> => {
  try {
    const planId = await getUserSelectedPlanId(userId);
    if (!planId) return 0;
    
    const { data: allDays } = await supabase
      .from('reading_plan_chapters')
      .select('day_number')
      .eq('plan_id', planId)
      .order('day_number');
    
    if (!allDays) return 0;
    
    const uniqueDays = [...new Set(allDays.map(d => d.day_number).filter(Boolean))];
    let completedCount = 0;
    
    for (const dayNumber of uniqueDays) {
      const progress = await getDayProgress(userId, dayNumber);
      if (progress === 100) {
        completedCount++;
      }
    }
    
    return completedCount;
  } catch (error) {
    logger.error('Fallback count error', error);
    return 0;
  }
};

export const getOverallProgress = async (userId: string): Promise<ProgressMetrics> => {
  try {
    const planId = await getUserSelectedPlanId(userId);
    if (!planId) {
      return {
        totalPassages: 0,
        passagesRead: 0,
        passagesRemaining: 0,
        progressPercentage: 0,
        completedDays: 0
      };
    }
    
    const { count: totalCount } = await supabase
      .from('reading_plan_chapters')
      .select('*', { count: 'exact', head: true })
      .eq('plan_id', planId);
    
    const { count: completedCount } = await supabase
      .from('user_progress')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('status', 'completed');
    
    const completedDays = await getCompletedDaysCount(userId);
    
    return {
      totalPassages: totalCount || 0,
      passagesRead: completedCount || 0,
      passagesRemaining: (totalCount || 0) - (completedCount || 0),
      progressPercentage: calculatePercentage(completedCount || 0, totalCount || 0),
      completedDays
    };
  } catch (error) {
    logger.error('Get overall progress error', error);
    return {
      totalPassages: 0,
      passagesRead: 0,
      passagesRemaining: 0,
      progressPercentage: 0,
      completedDays: 0
    };
  }
};
