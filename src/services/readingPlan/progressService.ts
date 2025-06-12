
/**
 * Service gérant la progression de l'utilisateur
 * VERSION OPTIMISÉE - Utilise les services unifiés pour la cohérence
 */

import { 
  getUnifiedUserProgressForDay, 
  toggleUnifiedChapterStatus, 
  type DayProgressWithChapters 
} from './unifiedProgressService';
import { getDayProgressPercentage, getUnifiedStats } from './unifiedStatsService';

// Ré-exporter les types pour la compatibilité
export type { DayProgressWithChapters } from './unifiedProgressService';

/**
 * Récupère la progression de l'utilisateur pour un jour donné
 * @param userId - ID de l'utilisateur
 * @param dayNumber - Numéro du jour
 * @returns Progression avec les informations des chapitres
 */
export const getUserProgressForDay = getUnifiedUserProgressForDay;

/**
 * Change le statut d'un chapitre entre 'pending' et 'completed'
 * @param userId - ID de l'utilisateur
 * @param chapterId - ID du chapitre
 * @param currentStatus - Statut actuel
 * @returns Résultat de l'opération
 */
export const toggleChapterStatus = toggleUnifiedChapterStatus;

/**
 * Calcule le pourcentage de progression pour un jour donné
 * @param userId - ID de l'utilisateur
 * @param dayNumber - Numéro du jour
 * @returns Pourcentage de progression
 */
export const getDayProgress = getDayProgressPercentage;

/**
 * Calcule la progression globale du plan de lecture
 * NOUVELLE VERSION - Utilise les statistiques unifiées
 * @param userId - ID de l'utilisateur
 * @returns Statistiques globales avec distinction jours/chapitres
 */
export const getOverallProgress = async (userId: string) => {
  try {
    console.log(`📊 Récupération de la progression globale pour l'utilisateur: ${userId}`);
    
    // Utiliser le service unifié pour obtenir les statistiques complètes
    const unifiedStats = await getUnifiedStats(userId);
    
    // Retourner dans le format attendu par les composants existants
    // (pour la rétrocompatibilité)
    const result = {
      totalPassages: unifiedStats.totalChapters,
      passagesRead: unifiedStats.chaptersRead,
      passagesRemaining: unifiedStats.chaptersRemaining,
      progressPercentage: unifiedStats.chaptersReadPercentage,
      // Nouvelles données disponibles
      totalDays: unifiedStats.totalDays,
      daysCompleted: unifiedStats.daysCompleted,
      daysRemaining: unifiedStats.daysRemaining,
      daysCompletedPercentage: unifiedStats.daysCompletedPercentage
    };
    
    console.log(`📊 Progression globale calculée:`, result);
    return result;
    
  } catch (error) {
    console.error("❌ Erreur lors du calcul de la progression globale:", error);
    return {
      totalPassages: 0,
      passagesRead: 0,
      passagesRemaining: 0,
      progressPercentage: 0,
      totalDays: 365,
      daysCompleted: 0,
      daysRemaining: 365,
      daysCompletedPercentage: 0
    };
  }
};
