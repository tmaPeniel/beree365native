
/**
 * Service de progression optimisé pour le plan de lecture
 * VERSION SIMPLIFIÉE - Cache unifié et cohérent
 * 
 * Corrections apportées :
 * - Élimination du cache léger redondant
 * - Utilisation exclusive du cache global
 * - Configuration plus réactive
 * - Logs de debugging détaillés
 */

import { supabase } from "@/integrations/supabase/client";
import { UserProgress, ReadingPlanChapter } from "@/types/supabase";
import { invalidateUserCacheSelective, optimizedToggleChapterStatus as newOptimizedToggle } from "./optimizedCacheService";
import { ActivityService } from '../auth/activityService';

const DEBUG_MODE = true; // Activer les logs de debugging

/**
 * Récupère la progression de l'utilisateur pour un jour donné
 * VERSION SIMPLIFIÉE - Sans cache léger redondant
 * 
 * @param userId - ID de l'utilisateur
 * @param dayNumber - Numéro du jour (1-365)
 * @returns Tableau de la progression utilisateur avec informations des chapitres
 */
export const getCachedUserProgressForDay = async (userId: string, dayNumber: number) => {
  if (DEBUG_MODE) {
    console.log(`🔍 [PROGRESS] Fetching progress for user ${userId}, day ${dayNumber}`);
  }
  
  try {
    // Requête directe et simple - pas de cache léger
    const { data: chapters } = await supabase
      .from('reading_plan_chapters')
      .select('id')
      .eq('day_number', dayNumber);
    
    if (!chapters || chapters.length === 0) {
      if (DEBUG_MODE) {
        console.log(`📊 [PROGRESS] No chapters found for day ${dayNumber}`);
      }
      return [];
    }
    
    const chapterIds = chapters.map(chapter => chapter.id);
    
    if (DEBUG_MODE) {
      console.log(`📊 [PROGRESS] Found ${chapters.length} chapters for day ${dayNumber}`);
    }
    
    // Récupérer la progression pour ces chapitres
    const { data, error } = await supabase
      .from('user_progress')
      .select('id, user_id, chapter_id, status, completed_at, reading_plan_chapters!inner(id, reference)')
      .eq('user_id', userId)
      .in('chapter_id', chapterIds);
    
    if (error) {
      console.error('❌ [ERROR] Failed to fetch user progress:', error);
      throw error;
    }
    
    if (DEBUG_MODE) {
      console.log(`📊 [PROGRESS] Retrieved ${data?.length || 0} progress entries`);
    }
    
    return data as (UserProgress & { reading_plan_chapters: ReadingPlanChapter })[];
  } catch (error) {
    console.error(`❌ [ERROR] Error fetching progress for day ${dayNumber}:`, error);
    return [];
  }
};

/**
 * Invalide sélectivement le cache de progression
 * VERSION SIMPLIFIÉE - Utilise uniquement le cache global
 * 
 * @param userId - ID de l'utilisateur
 * @param dayNumber - Numéro du jour spécifique (optionnel)
 */
export const invalidateProgressCache = (userId: string, dayNumber?: number) => {
  if (DEBUG_MODE) {
    console.log(`🗑️ [INVALIDATE] Invalidating progress cache for user ${userId}${dayNumber ? `, day ${dayNumber}` : ''}`);
  }
  
  // Utiliser uniquement l'invalidation du cache global
  invalidateUserCacheSelective(userId);
};

/**
 * Fonction de toggle optimisée - Réexportation du service unifié
 * Cette fonction utilise le service de cache optimisé
 */
export const optimizedToggleChapterStatus = newOptimizedToggle;
