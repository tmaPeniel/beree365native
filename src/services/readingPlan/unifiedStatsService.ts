
/**
 * Service unifié pour les statistiques de progression
 * Calcule séparément les jours complétés (100%) et les chapitres lus
 */

import { supabase } from "@/integrations/supabase/client";

/**
 * Interface pour les statistiques unifiées
 */
export interface UnifiedStats {
  /** Nombre total de jours dans le plan (365) */
  totalDays: number;
  /** Nombre de jours complétés à 100% */
  daysCompleted: number;
  /** Nombre de jours restants à compléter */
  daysRemaining: number;
  /** Pourcentage de jours complétés */
  daysCompletedPercentage: number;
  /** Nombre total de chapitres dans le plan */
  totalChapters: number;
  /** Nombre de chapitres lus individuellement */
  chaptersRead: number;
  /** Nombre de chapitres restants à lire */
  chaptersRemaining: number;
  /** Pourcentage de chapitres lus */
  chaptersReadPercentage: number;
}

/**
 * Calcule les statistiques unifiées pour un utilisateur
 * @param userId - ID de l'utilisateur
 * @returns Statistiques complètes avec jours complétés et chapitres lus séparés
 */
export const getUnifiedStats = async (userId: string): Promise<UnifiedStats> => {
  try {
    console.log(`📊 Calcul des statistiques unifiées pour l'utilisateur: ${userId}`);

    // 1. Récupérer le nombre total de chapitres
    const { count: totalChapters, error: totalError } = await supabase
      .from('reading_plan_chapters')
      .select('*', { count: 'exact', head: true });

    if (totalError) throw totalError;

    // 2. Récupérer les chapitres lus par l'utilisateur
    const { count: chaptersRead, error: readError } = await supabase
      .from('user_progress')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('status', 'completed');

    if (readError) throw readError;

    // 3. Calculer les jours complétés (jours où tous les chapitres sont lus)
    const daysCompleted = await calculateCompletedDays(userId);

    // 4. Calculer les statistiques
    const totalDays = 365;
    const stats: UnifiedStats = {
      totalDays,
      daysCompleted,
      daysRemaining: totalDays - daysCompleted,
      daysCompletedPercentage: Math.round((daysCompleted / totalDays) * 100),
      totalChapters: totalChapters || 0,
      chaptersRead: chaptersRead || 0,
      chaptersRemaining: (totalChapters || 0) - (chaptersRead || 0),
      chaptersReadPercentage: totalChapters ? Math.round(((chaptersRead || 0) / totalChapters) * 100) : 0
    };

    console.log(`📊 Statistiques calculées:`, stats);
    return stats;

  } catch (error) {
    console.error("❌ Erreur lors du calcul des statistiques unifiées:", error);
    // Retourner des valeurs par défaut en cas d'erreur
    return {
      totalDays: 365,
      daysCompleted: 0,
      daysRemaining: 365,
      daysCompletedPercentage: 0,
      totalChapters: 0,
      chaptersRead: 0,
      chaptersRemaining: 0,
      chaptersReadPercentage: 0
    };
  }
};

/**
 * Calcule le nombre de jours complétés à 100%
 * Un jour est considéré comme complété si tous ses chapitres sont marqués comme 'completed'
 * @param userId - ID de l'utilisateur
 * @returns Nombre de jours complétés
 */
export const calculateCompletedDays = async (userId: string): Promise<number> => {
  try {
    console.log(`📅 Calcul des jours complétés pour l'utilisateur: ${userId}`);

    // Récupérer tous les jours avec leurs chapitres
    const { data: allDays, error: daysError } = await supabase
      .from('reading_plan_chapters')
      .select('day_number')
      .order('day_number');

    if (daysError) throw daysError;

    if (!allDays || allDays.length === 0) {
      console.log("📅 Aucun jour trouvé dans le plan");
      return 0;
    }

    // Obtenir la liste unique des jours
    const uniqueDays = [...new Set(allDays.map(day => day.day_number))];
    console.log(`📅 Total de jours dans le plan: ${uniqueDays.length}`);

    let completedDaysCount = 0;

    // Vérifier chaque jour individuellement
    for (const dayNumber of uniqueDays) {
      const isDayCompleted = await isDayFullyCompleted(userId, dayNumber);
      if (isDayCompleted) {
        completedDaysCount++;
      }
    }

    console.log(`📅 Jours complétés: ${completedDaysCount}/${uniqueDays.length}`);
    return completedDaysCount;

  } catch (error) {
    console.error("❌ Erreur lors du calcul des jours complétés:", error);
    return 0;
  }
};

/**
 * Vérifie si un jour spécifique est entièrement complété (100%)
 * @param userId - ID de l'utilisateur
 * @param dayNumber - Numéro du jour à vérifier
 * @returns true si tous les chapitres du jour sont complétés
 */
export const isDayFullyCompleted = async (userId: string, dayNumber: number): Promise<boolean> => {
  try {
    // 1. Récupérer tous les chapitres de ce jour
    const { data: dayChapters, error: chaptersError } = await supabase
      .from('reading_plan_chapters')
      .select('id')
      .eq('day_number', dayNumber);

    if (chaptersError) throw chaptersError;

    if (!dayChapters || dayChapters.length === 0) {
      console.log(`📅 Aucun chapitre trouvé pour le jour ${dayNumber}`);
      return false;
    }

    const chapterIds = dayChapters.map(chapter => chapter.id);
    const totalChaptersInDay = chapterIds.length;

    // 2. Récupérer les chapitres complétés pour ce jour
    const { count: completedChaptersCount, error: progressError } = await supabase
      .from('user_progress')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .in('chapter_id', chapterIds)
      .eq('status', 'completed');

    if (progressError) throw progressError;

    // 3. Un jour est complété si tous ses chapitres sont marqués comme 'completed'
    const isCompleted = (completedChaptersCount || 0) === totalChaptersInDay;
    
    console.log(`📅 Jour ${dayNumber}: ${completedChaptersCount}/${totalChaptersInDay} chapitres complétés - ${isCompleted ? 'COMPLÉTÉ' : 'INCOMPLET'}`);
    
    return isCompleted;

  } catch (error) {
    console.error(`❌ Erreur lors de la vérification du jour ${dayNumber}:`, error);
    return false;
  }
};

/**
 * Calcule le pourcentage de progression pour un jour donné
 * @param userId - ID de l'utilisateur
 * @param dayNumber - Numéro du jour
 * @returns Pourcentage de progression (0-100)
 */
export const getDayProgressPercentage = async (userId: string, dayNumber: number): Promise<number> => {
  try {
    // Récupérer tous les chapitres de ce jour
    const { data: dayChapters, error: chaptersError } = await supabase
      .from('reading_plan_chapters')
      .select('id')
      .eq('day_number', dayNumber);

    if (chaptersError) throw chaptersError;

    if (!dayChapters || dayChapters.length === 0) {
      return 0;
    }

    const chapterIds = dayChapters.map(chapter => chapter.id);
    const totalChapters = chapterIds.length;

    // Récupérer les chapitres complétés
    const { count: completedCount, error: progressError } = await supabase
      .from('user_progress')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .in('chapter_id', chapterIds)
      .eq('status', 'completed');

    if (progressError) throw progressError;

    const percentage = Math.round(((completedCount || 0) / totalChapters) * 100);
    return percentage;

  } catch (error) {
    console.error(`❌ Erreur lors du calcul de la progression du jour ${dayNumber}:`, error);
    return 0;
  }
};
