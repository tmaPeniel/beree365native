
/**
 * Service unifié pour les statistiques de lecture
 * Calcule séparément les jours complétés (100%) et les chapitres lus
 * Utilise le cache global pour la cohérence avec tous les composants
 */

import { supabase } from "@/integrations/supabase/client";
import { getOptimizedReadingPlanData } from './optimizedCacheService';

/**
 * Interface pour les statistiques détaillées
 */
export interface DetailedStats {
  completedDays: number;        // Jours avec 100% de progression
  completedChapters: number;    // Nombre total de chapitres lus
  totalChapters: number;        // Nombre total de chapitres dans le plan
  progressPercentage: number;   // Pourcentage de progression globale
  averageCompletionRate: number; // Taux de complétion moyen par jour
}

/**
 * Interface pour les statistiques rapides (compatibilité)
 */
export interface QuickStats {
  passagesRead: number;
  progressPercentage: number;
}

/**
 * Calcule les statistiques détaillées de l'utilisateur
 * Utilise le cache global pour la cohérence avec les autres composants
 */
export const getDetailedUserStats = async (userId: string, startDate: string): Promise<DetailedStats> => {
  try {
    console.log(`📊 Calcul des statistiques détaillées pour l'utilisateur ${userId}`);
    
    // Utiliser le cache global optimisé pour la cohérence
    const optimizedData = await getOptimizedReadingPlanData(userId, startDate);
    
    if (!optimizedData || optimizedData.length === 0) {
      console.warn("Aucune donnée de plan de lecture trouvée");
      return {
        completedDays: 0,
        completedChapters: 0,
        totalChapters: 0,
        progressPercentage: 0,
        averageCompletionRate: 0
      };
    }

    // Calculer les statistiques à partir des données optimisées
    let completedDays = 0;
    let totalCompletedChapters = 0;
    let totalChapters = 0;

    optimizedData.forEach(dayData => {
      const completedInDay = dayData.chapters.filter(chapter => chapter.isCompleted).length;
      const totalInDay = dayData.chapters.length;
      
      totalCompletedChapters += completedInDay;
      totalChapters += totalInDay;
      
      // Un jour est considéré comme complété si tous ses chapitres sont lus (100%)
      if (completedInDay === totalInDay && totalInDay > 0) {
        completedDays++;
      }
    });

    const progressPercentage = totalChapters > 0 ? Math.round((totalCompletedChapters / totalChapters) * 100) : 0;
    const averageCompletionRate = optimizedData.length > 0 ? (totalCompletedChapters / totalChapters) * 100 / optimizedData.length : 0;

    const stats = {
      completedDays,
      completedChapters: totalCompletedChapters,
      totalChapters,
      progressPercentage,
      averageCompletionRate: Math.round(averageCompletionRate)
    };

    console.log(`📊 Statistiques calculées:`, stats);
    return stats;

  } catch (error) {
    console.error("Erreur lors du calcul des statistiques détaillées:", error);
    return {
      completedDays: 0,
      completedChapters: 0,
      totalChapters: 0,
      progressPercentage: 0,
      averageCompletionRate: 0
    };
  }
};

/**
 * Calcule les statistiques rapides pour la compatibilité avec l'ancien code
 * Utilise les mêmes données que getDetailedUserStats pour la cohérence
 */
export const getQuickUserStats = async (userId: string, startDate: string): Promise<QuickStats> => {
  const detailedStats = await getDetailedUserStats(userId, startDate);
  
  return {
    passagesRead: detailedStats.completedChapters,
    progressPercentage: detailedStats.progressPercentage
  };
};

/**
 * Calcule les statistiques pour un jour spécifique
 * Retourne le pourcentage de complétion pour ce jour
 */
export const getDayCompletionStats = async (userId: string, dayNumber: number): Promise<number> => {
  try {
    console.log(`📊 Calcul de la progression pour le jour ${dayNumber}`);
    
    // Requête optimisée pour un jour spécifique
    const { data: chapters } = await supabase
      .from('reading_plan_chapters')
      .select('id')
      .eq('day_number', dayNumber);
    
    if (!chapters || chapters.length === 0) {
      return 0;
    }
    
    const chapterIds = chapters.map(chapter => chapter.id);
    
    const { data: userProgress } = await supabase
      .from('user_progress')
      .select('id')
      .eq('user_id', userId)
      .in('chapter_id', chapterIds)
      .eq('status', 'completed');
    
    const completedCount = userProgress?.length || 0;
    const percentage = Math.round((completedCount / chapters.length) * 100);
    
    console.log(`📊 Jour ${dayNumber}: ${completedCount}/${chapters.length} chapitres (${percentage}%)`);
    return percentage;
    
  } catch (error) {
    console.error(`Erreur lors du calcul des stats pour le jour ${dayNumber}:`, error);
    return 0;
  }
};

/**
 * Invalide le cache des statistiques
 * Utile après une mise à jour de progression
 */
export const invalidateStatsCache = (userId: string) => {
  console.log(`🔄 Invalidation du cache des statistiques pour l'utilisateur ${userId}`);
  // Le cache sera invalidé via optimizedCacheService
  // Cette fonction est ici pour la compatibilité et la clarté
};
