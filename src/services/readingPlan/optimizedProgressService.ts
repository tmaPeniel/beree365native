
/**
 * Service de progression optimisé utilisant le nouveau cache global
 */

import { supabase } from "@/integrations/supabase/client";
import { UserProgress, ReadingPlanChapter } from "@/types/supabase";
import { toast } from "sonner";
import { invalidateUserCacheSelective, optimizedToggleChapterStatus as newOptimizedToggle } from "./optimizedCacheService";

// Cache léger pour compatibilité avec l'ancien code
const lightCache = new Map<string, any>();
const LIGHT_CACHE_DURATION = 2 * 60 * 1000; // 2 minutes

/**
 * Récupère la progression de l'utilisateur avec cache léger
 */
export const getCachedUserProgressForDay = async (userId: string, dayNumber: number) => {
  const cacheKey = `light-progress-${userId}-${dayNumber}`;
  const cached = lightCache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < LIGHT_CACHE_DURATION) {
    return cached.data;
  }
  
  try {
    // Requête optimisée simplifiée
    const { data: chapters } = await supabase
      .from('reading_plan_chapters')
      .select('id')
      .eq('day_number', dayNumber);
    
    if (!chapters || chapters.length === 0) {
      lightCache.set(cacheKey, { data: [], timestamp: Date.now() });
      return [];
    }
    
    const chapterIds = chapters.map(chapter => chapter.id);
    
    const { data, error } = await supabase
      .from('user_progress')
      .select('id, user_id, chapter_id, status, completed_at, reading_plan_chapters!inner(id, reference)')
      .eq('user_id', userId)
      .in('chapter_id', chapterIds);
    
    if (error) throw error;
    
    // Cache léger
    lightCache.set(cacheKey, { data: data || [], timestamp: Date.now() });
    
    return data as (UserProgress & { reading_plan_chapters: ReadingPlanChapter })[];
  } catch (error) {
    console.error(`Error fetching user progress for day ${dayNumber}:`, error);
    return [];
  }
};

/**
 * Invalide le cache léger
 */
export const invalidateProgressCache = (userId: string, dayNumber?: number) => {
  if (dayNumber) {
    const cacheKey = `light-progress-${userId}-${dayNumber}`;
    lightCache.delete(cacheKey);
  } else {
    // Invalider seulement les entrées de cet utilisateur
    for (const key of lightCache.keys()) {
      if (key.startsWith(`light-progress-${userId}-`)) {
        lightCache.delete(key);
      }
    }
  }
  
  // Aussi invalider le cache global
  invalidateUserCacheSelective(userId);
};

/**
 * Toggle optimisé utilisant le nouveau service
 */
export const optimizedToggleChapterStatus = newOptimizedToggle;
