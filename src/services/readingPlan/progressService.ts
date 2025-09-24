/**
 * Service gérant la progression de l'utilisateur
 */

import { supabase } from "@/integrations/supabase/client";
import { UserProgress, ReadingPlanChapter } from "@/types/supabase";
import { toast } from "sonner";
import { ActivityService } from '../auth/activityService';

/**
 * Récupère la progression de l'utilisateur pour un jour donné
 * @param {string} userId ID de l'utilisateur
 * @param {number} dayNumber Numéro du jour
 * @returns {Promise<Array<UserProgress & {reading_plan_chapters: ReadingPlanChapter}>>}
 */
export const getUserProgressForDay = async (userId: string, dayNumber: number) => {
  try {
    if (!userId) {
      console.error("getUserProgressForDay: No user ID provided");
      return [];
    }
    
    console.log(`Fetching user progress for user ${userId} and day ${dayNumber}...`);
    
    // D'abord récupérer tous les chapitres pour ce jour
    const { data: chapters, error: chaptersError } = await supabase
      .from('reading_plan_chapters')
      .select('*')
      .eq('day_number', dayNumber);
    
    if (chaptersError) {
      console.error(`Error fetching chapters for day ${dayNumber}:`, chaptersError);
      throw chaptersError;
    }
    
    if (!chapters || chapters.length === 0) {
      console.log(`No chapters found for day ${dayNumber}`);
      return [];
    }
    
    console.log(`Found ${chapters.length} chapters for day ${dayNumber}`);
    
    // Récupérer la progression existante (peut être vide pour un nouvel utilisateur)
    const chapterIds = chapters.map(chapter => chapter.id);
    const { data: progressData, error: progressError } = await supabase
      .from('user_progress')
      .select('*')
      .eq('user_id', userId)
      .in('chapter_id', chapterIds);
    
    if (progressError) {
      console.error(`Error fetching user progress for day ${dayNumber}:`, progressError);
      throw progressError;
    }
    
    console.log(`Found ${progressData?.length || 0} existing progress entries for user ${userId} and day ${dayNumber}`);
    
    // Créer la structure de retour en combinant chapitres et progression
    const result = chapters.map(chapter => {
      const progressItem = progressData?.find(p => p.chapter_id === chapter.id);
      
      // Si aucune progression n'existe, le statut par défaut est 'pending' (non lu)
      return {
        id: progressItem?.id || `temp-${chapter.id}`,
        user_id: userId,
        chapter_id: chapter.id,
        status: progressItem?.status || 'pending' as const,
        completed_at: progressItem?.completed_at || null,
        reading_plan_chapters: chapter
      };
    });
    
    console.log(`Successfully created ${result.length} progress entries for user ${userId} and day ${dayNumber}`);
    return result as (UserProgress & { reading_plan_chapters: ReadingPlanChapter })[];
  } catch (error) {
    console.error(`Error fetching user progress for day ${dayNumber}:`, error);
    return [];
  }
};

/**
 * Change le statut d'un chapitre entre 'pending' et 'completed'
 * @param {string} userId ID de l'utilisateur
 * @param {string} chapterId ID du chapitre
 * @param {ChapterStatus} currentStatus Statut actuel
 * @returns {Promise<{success: boolean, data?: any, error?: string}>}
 */
export const toggleChapterStatus = async (userId: string, chapterId: string, currentStatus: 'pending' | 'completed') => {
  console.log(`Toggling chapter status - User: ${userId}, Chapter: ${chapterId}, Current status: ${currentStatus}`);
  
  // Vérifier l'authentification
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session) {
    console.error("toggleChapterStatus: User not authenticated");
    toast.error("Vous devez être connecté pour modifier le statut de lecture");
    return { success: false, error: "User not authenticated" };
  }
  
  const newStatus = currentStatus === 'pending' ? 'completed' : 'pending';
  const completedAt = newStatus === 'completed' ? new Date().toISOString() : null;
  
  try {
    // Vérifier si une entrée existe déjà
    console.log(`Checking if entry exists for user ${userId} and chapter ${chapterId}...`);
    const { data: existingEntries, error: checkError } = await supabase
      .from('user_progress')
      .select('*')
      .eq('user_id', userId)
      .eq('chapter_id', chapterId);
      
    if (checkError) {
      console.error("Error checking existing entries:", checkError);
      toast.error("Erreur lors de la vérification de votre progression");
      return { success: false, error: checkError.message };
    }
    
    console.log(`Found ${existingEntries?.length || 0} existing entries`);
    
    let result;
    
    if (existingEntries && existingEntries.length > 0) {
      console.log(`Updating existing entry to status: ${newStatus}`);
      // Mettre à jour l'entrée existante
      const { data, error } = await supabase
        .from('user_progress')
        .update({ 
          status: newStatus,
          completed_at: completedAt
        })
        .eq('user_id', userId)
        .eq('chapter_id', chapterId)
        .select();
      
      if (error) {
        console.error("Error updating status:", error);
        toast.error(`Erreur lors de la mise à jour: ${error.message}`);
        throw error;
      }
      
      console.log("Update successful:", data);
      result = { success: true, data };
    } else {
      console.log(`Creating new entry with status: ${newStatus}`);
      // Créer une nouvelle entrée (première action de l'utilisateur sur ce chapitre)
      const { data, error } = await supabase
        .from('user_progress')
        .insert([{ 
          user_id: userId,
          chapter_id: chapterId,
          status: newStatus,
          completed_at: completedAt
        }])
        .select();
      
      if (error) {
        console.error("Error creating new entry:", error);
        toast.error(`Erreur lors de la création: ${error.message}`);
        throw error;
      }
      
      console.log("Insert successful:", data);
      result = { success: true, data };
    }
    
    // Mettre à jour l'activité utilisateur pour toute action de toggle (cocher/décocher)
    await ActivityService.updateUserActivity(userId);
    
    // Notifier l'utilisateur
    toast.success(newStatus === 'completed' ? 
      "Passage marqué comme lu" : 
      "Passage marqué comme non lu"
    );
    
    return result;
  } catch (error: any) {
    console.error("Error toggling chapter status:", error);
    toast.error(`Une erreur est survenue: ${error.message}`);
    return { success: false, error: error.message };
  }
};

/**
 * Calcule le pourcentage de progression pour un jour donné
 * @param {string} userId ID de l'utilisateur
 * @param {number} dayNumber Numéro du jour
 * @returns {Promise<number>} Pourcentage de progression
 */
export const getDayProgress = async (userId: string, dayNumber: number) => {
  try {
    // Récupérer tous les chapitres pour ce jour
    const { data: chapters, error: chaptersError } = await supabase
      .from('reading_plan_chapters')
      .select('id')
      .eq('day_number', dayNumber);
    
    if (chaptersError) throw chaptersError;
    if (!chapters || chapters.length === 0) return 0;
    
    const chapterIds = chapters.map(chapter => chapter.id);
    
    // Récupérer seulement les chapitres marqués comme 'completed'
    // (les chapitres sans entrée dans user_progress sont considérés comme 'pending')
    const { data: completedChapters, error: progressError } = await supabase
      .from('user_progress')
      .select('*')
      .eq('user_id', userId)
      .in('chapter_id', chapterIds)
      .eq('status', 'completed');
    
    if (progressError) throw progressError;
    
    // Calculer le pourcentage
    const completedCount = completedChapters ? completedChapters.length : 0;
    const totalCount = chapters.length;
    const percentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
    
    console.log(`Day ${dayNumber} progress: ${completedCount}/${totalCount} (${percentage}%)`);
    return percentage;
  } catch (error) {
    console.error(`Erreur lors du calcul de la progression pour le jour ${dayNumber}:`, error);
    return 0;
  }
};

/**
 * Calcule le nombre de jours complétés à 100%
 * @param {string} userId ID de l'utilisateur
 * @returns {Promise<number>} Nombre de jours complètement terminés
 */
export const getCompletedDaysCount = async (userId: string) => {
  try {
    console.log(`Calculating completed days count for user ${userId}...`);
    
    // Requête optimisée pour compter les jours où tous les chapitres sont complétés
    const { data, error } = await supabase.rpc('get_completed_days_count', {
      p_user_id: userId
    });
    
    if (error) {
      // Si la fonction RPC n'existe pas, utiliser une approche alternative
      console.log('RPC function not available, using alternative approach');
      return await getCompletedDaysCountFallback(userId);
    }
    
    const completedDaysCount = data || 0;
    console.log(`User ${userId} has ${completedDaysCount} completed days`);
    return completedDaysCount;
  } catch (error) {
    console.error("Erreur lors du calcul des jours complétés:", error);
    return await getCompletedDaysCountFallback(userId);
  }
};

/**
 * Méthode alternative pour calculer les jours complétés (fallback)
 * @param {string} userId ID de l'utilisateur
 * @returns {Promise<number>} Nombre de jours complètement terminés
 */
const getCompletedDaysCountFallback = async (userId: string): Promise<number> => {
  try {
    // Récupérer tous les jours distincts du plan de lecture
    const { data: allDays, error: daysError } = await supabase
      .from('reading_plan_chapters')
      .select('day_number')
      .order('day_number');
    
    if (daysError) throw daysError;
    if (!allDays) return 0;
    
    // Obtenir les numéros de jours uniques avec typage explicite et vérification null
    const dayNumbers: number[] = allDays
      .map(day => day?.day_number)
      .filter((dayNumber): dayNumber is number => dayNumber != null);
    
    const uniqueDays: number[] = [...new Set(dayNumbers)];
    let completedDaysCount = 0;
    
    // Pour chaque jour, vérifier s'il est complété à 100%
    for (const dayNumber of uniqueDays) {
      const progressPercentage = await getDayProgress(userId, dayNumber);
      if (progressPercentage === 100) {
        completedDaysCount++;
      }
    }
    
    console.log(`Fallback method: User ${userId} has ${completedDaysCount} completed days`);
    return completedDaysCount;
  } catch (error) {
    console.error("Erreur dans la méthode fallback des jours complétés:", error);
    return 0;
  }
};

/**
 * Calcule la progression globale du plan de lecture
 * @param {string} userId ID de l'utilisateur
 * @returns {Promise<{totalPassages: number, passagesRead: number, passagesRemaining: number, progressPercentage: number, completedDays: number}>}
 */
export const getOverallProgress = async (userId: string) => {
  try {
    console.log(`Calculating overall progress for user ${userId}...`);
    
    // Récupérer le nombre total de chapitres
    const { count: totalCount, error: totalError } = await supabase
      .from('reading_plan_chapters')
      .select('*', { count: 'exact', head: true });
    
    if (totalError) throw totalError;
    
    // Récupérer seulement les chapitres marqués comme 'completed'
    const { count: completedCount, error: completedError } = await supabase
      .from('user_progress')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('status', 'completed');
    
    if (completedError) throw completedError;
    
    // Calculer le nombre de jours complétés à 100%
    const completedDays = await getCompletedDaysCount(userId);
    
    const result = {
      totalPassages: totalCount || 0,
      passagesRead: completedCount || 0,
      passagesRemaining: (totalCount || 0) - (completedCount || 0),
      progressPercentage: totalCount ? Math.round(((completedCount || 0) / totalCount) * 100) : 0,
      completedDays: completedDays
    };
    
    console.log(`Overall progress for user ${userId}:`, result);
    return result;
  } catch (error) {
    console.error("Erreur lors du calcul de la progression globale:", error);
    return {
      totalPassages: 0,
      passagesRead: 0,
      passagesRemaining: 0,
      progressPercentage: 0,
      completedDays: 0
    };
  }
};
