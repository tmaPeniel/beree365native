
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
import { calculateUserBadges, getUserBadges, Badge, UserBadge } from '../badgeService';

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
  
  try {
    // D'abord récupérer le plan sélectionné de l'utilisateur
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('selected_plan_id')
      .eq('id', userId)
      .single();

    if (profileError) throw profileError;

    // Requête directe et simple - filtrer par plan
    const { data: chapters } = await supabase
      .from('reading_plan_chapters')
      .select('id')
      .eq('day_number', dayNumber)
      .eq('plan_id', profile.selected_plan_id);
    
    if (!chapters || chapters.length === 0) {
      if (DEBUG_MODE) {
        console.log(`📊 [PROGRESS] No chapters found for day ${dayNumber}`);
      }
      return [];
    }
    
    const chapterIds = chapters.map(chapter => chapter.id);
    
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
  
  // Utiliser uniquement l'invalidation du cache global
  invalidateUserCacheSelective(userId);
};

/**
 * Fonction de toggle optimisée avec calcul automatique des badges
 * Retourne les nouveaux badges débloqués pour affichage
 */
export const optimizedToggleChapterStatus = async (
  userId: string,
  chapterId: string,
  newStatus: 'completed' | 'pending',
  dayNumber?: number
): Promise<{ success: boolean; error?: string; newBadges?: Badge[] }> => {
  try {
    // Appeler la fonction originale
    const result = await newOptimizedToggle(userId, chapterId, newStatus, dayNumber);
    
    // Si le toggle a réussi et qu'un chapitre a été complété, calculer les badges
    if (result?.success && newStatus === 'completed') {
      try {
        // Récupérer les badges actuels AVANT le calcul
        const badgesBefore = await getUserBadges(userId);
        const badgeIdsBefore = new Set(badgesBefore.map(b => b.badge_id));
        
        // Calculer les nouveaux badges
        await calculateUserBadges(userId);
        
        // Récupérer les badges APRÈS le calcul
        const badgesAfter = await getUserBadges(userId);
        
        // Identifier les nouveaux badges débloqués
        const newBadges = badgesAfter
          .filter(userBadge => !badgeIdsBefore.has(userBadge.badge_id))
          .map(userBadge => userBadge.badge);
        
        return { success: true, newBadges };
      } catch (badgeError) {
        console.error('Erreur lors du calcul des badges:', badgeError);
        // Continuer même si le calcul des badges échoue
        return { success: true, newBadges: [] };
      }
    }
    
    return { success: result?.success ?? false, newBadges: [] };
  } catch (error) {
    console.error('Erreur dans optimizedToggleChapterStatus avec badges:', error);
    return { success: false, error: 'Erreur lors de la mise à jour' };
  }
};
