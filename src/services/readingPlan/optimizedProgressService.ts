/**
 * Service optimisé pour la gestion de la progression avec mise à jour d'activité
 */

import { supabase } from "@/integrations/supabase/client";
import { UserProgress, ReadingPlanChapter } from "@/types/supabase";
import { updateUserActivity } from "@/services/auth/activityService";

interface OptimizedProgressResult {
  success: boolean;
  data?: any;
  error?: string;
}

/**
 * Récupère la progression de l'utilisateur pour un jour donné depuis le cache
 * @param {string} userId ID de l'utilisateur
 * @param {number} dayNumber Numéro du jour
 * @returns {Promise<Array<UserProgress & {reading_plan_chapters: ReadingPlanChapter}>>}
 */
export const getCachedUserProgressForDay = async (userId: string, dayNumber: number) => {
  try {
    if (!userId) {
      console.error("getCachedUserProgressForDay: No user ID provided");
      return [];
    }
    
    // Récupérer tous les chapitres pour ce jour
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
    
    return result as (UserProgress & { reading_plan_chapters: ReadingPlanChapter })[];
  } catch (error) {
    console.error(`Error fetching user progress for day ${dayNumber}:`, error);
    return [];
  }
};

/**
 * Version optimisée pour changer le statut d'un chapitre avec mise à jour d'activité
 */
export const optimizedToggleChapterStatus = async (
  userId: string, 
  chapterId: string, 
  currentStatus: 'pending' | 'completed',
  dayNumber: number
): Promise<OptimizedProgressResult> => {
  try {
    const newStatus = currentStatus === 'pending' ? 'completed' : 'pending';
    const completedAt = newStatus === 'completed' ? new Date().toISOString() : null;
    
    // Vérifier si une entrée existe déjà
    const { data: existingEntries, error: checkError } = await supabase
      .from('user_progress')
      .select('*')
      .eq('user_id', userId)
      .eq('chapter_id', chapterId);
      
    if (checkError) {
      return { success: false, error: checkError.message };
    }
    
    let result;
    
    if (existingEntries && existingEntries.length > 0) {
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
      
      if (error) throw error;
      result = { success: true, data };
    } else {
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
      
      if (error) throw error;
      result = { success: true, data };
    }
    
    // NOUVEAU : Mettre à jour l'activité de l'utilisateur
    try {
      await updateUserActivity(userId);
      console.log("✅ Activité utilisateur mise à jour après progression optimisée");
    } catch (activityError) {
      console.error("⚠️ Erreur lors de la mise à jour de l'activité:", activityError);
      // Ne pas faire échouer l'opération principale
    }
    
    return result;
  } catch (error: any) {
    console.error("❌ Erreur dans optimizedToggleChapterStatus:", error);
    return { success: false, error: error.message };
  }
};
