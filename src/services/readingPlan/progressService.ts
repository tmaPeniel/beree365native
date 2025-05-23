
/**
 * Service gérant la progression de l'utilisateur
 */

import { supabase } from "@/integrations/supabase/client";
import { UserProgress, ReadingPlanChapter } from "@/types/supabase";
import { toast } from "sonner";

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
    
    const { data: chapters } = await supabase
      .from('reading_plan_chapters')
      .select('id')
      .eq('day_number', dayNumber);
    
    if (!chapters || chapters.length === 0) {
      console.log(`No chapters found for day ${dayNumber}`);
      return [];
    }
    
    const chapterIds = chapters.map(chapter => chapter.id);
    console.log(`Found ${chapterIds.length} chapter IDs for day ${dayNumber}`);
    
    const { data, error } = await supabase
      .from('user_progress')
      .select('*, reading_plan_chapters!inner(*)')
      .eq('user_id', userId)
      .in('chapter_id', chapterIds);
    
    if (error) {
      console.error(`Error fetching user progress for day ${dayNumber}:`, error);
      throw error;
    }
    
    console.log(`Successfully fetched ${data?.length || 0} progress entries for user ${userId} and day ${dayNumber}`);
    return data as (UserProgress & { reading_plan_chapters: ReadingPlanChapter })[];
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
    // Vérifier que l'entrée existe
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
      // Créer une nouvelle entrée
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
    
    // Récupérer les chapitres complétés
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
    
    return percentage;
  } catch (error) {
    console.error(`Erreur lors du calcul de la progression pour le jour ${dayNumber}:`, error);
    return 0;
  }
};

/**
 * Calcule la progression globale du plan de lecture
 * @param {string} userId ID de l'utilisateur
 * @returns {Promise<{totalPassages: number, passagesRead: number, passagesRemaining: number, progressPercentage: number}>}
 */
export const getOverallProgress = async (userId: string) => {
  try {
    // Récupérer le nombre total de chapitres
    const { count: totalCount, error: totalError } = await supabase
      .from('reading_plan_chapters')
      .select('*', { count: 'exact', head: true });
    
    if (totalError) throw totalError;
    
    // Récupérer le nombre de chapitres complétés
    const { count: completedCount, error: completedError } = await supabase
      .from('user_progress')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('status', 'completed');
    
    if (completedError) throw completedError;
    
    return {
      totalPassages: totalCount || 0,
      passagesRead: completedCount || 0,
      passagesRemaining: (totalCount || 0) - (completedCount || 0),
      progressPercentage: totalCount ? Math.round(((completedCount || 0) / totalCount) * 100) : 0
    };
  } catch (error) {
    console.error("Erreur lors du calcul de la progression globale:", error);
    return {
      totalPassages: 0,
      passagesRead: 0,
      passagesRemaining: 0,
      progressPercentage: 0
    };
  }
};
