
/**
 * Service de progression optimisé avec mise en cache
 */

import { supabase } from "@/integrations/supabase/client";
import { UserProgress, ReadingPlanChapter } from "@/types/supabase";
import { toast } from "sonner";

// Cache simple pour les données de progression
const progressCache = new Map<string, any>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Récupère la progression de l'utilisateur avec cache
 */
export const getCachedUserProgressForDay = async (userId: string, dayNumber: number) => {
  const cacheKey = `progress-${userId}-${dayNumber}`;
  const cached = progressCache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    console.log(`Using cached progress for day ${dayNumber}`);
    return cached.data;
  }
  
  try {
    console.log(`Fetching fresh progress data for day ${dayNumber}...`);
    
    // Requête optimisée avec select spécifique
    const { data: chapters } = await supabase
      .from('reading_plan_chapters')
      .select('id')
      .eq('day_number', dayNumber);
    
    if (!chapters || chapters.length === 0) {
      progressCache.set(cacheKey, { data: [], timestamp: Date.now() });
      return [];
    }
    
    const chapterIds = chapters.map(chapter => chapter.id);
    
    const { data, error } = await supabase
      .from('user_progress')
      .select('id, user_id, chapter_id, status, completed_at, reading_plan_chapters!inner(id, reference)')
      .eq('user_id', userId)
      .in('chapter_id', chapterIds);
    
    if (error) throw error;
    
    // Mettre en cache le résultat
    progressCache.set(cacheKey, { data: data || [], timestamp: Date.now() });
    
    return data as (UserProgress & { reading_plan_chapters: ReadingPlanChapter })[];
  } catch (error) {
    console.error(`Error fetching user progress for day ${dayNumber}:`, error);
    return [];
  }
};

/**
 * Invalide le cache pour un utilisateur et jour spécifique
 */
export const invalidateProgressCache = (userId: string, dayNumber?: number) => {
  if (dayNumber) {
    const cacheKey = `progress-${userId}-${dayNumber}`;
    progressCache.delete(cacheKey);
  } else {
    // Invalider tout le cache pour cet utilisateur
    for (const key of progressCache.keys()) {
      if (key.startsWith(`progress-${userId}-`)) {
        progressCache.delete(key);
      }
    }
  }
};

/**
 * Toggle optimisé du statut d'un chapitre
 */
export const optimizedToggleChapterStatus = async (
  userId: string, 
  chapterId: string, 
  currentStatus: 'pending' | 'completed',
  dayNumber: number
) => {
  console.log(`Optimized toggle - User: ${userId}, Chapter: ${chapterId}, Current: ${currentStatus}`);
  
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session) {
    toast.error("Vous devez être connecté pour modifier le statut de lecture");
    return { success: false, error: "User not authenticated" };
  }
  
  const newStatus = currentStatus === 'pending' ? 'completed' : 'pending';
  const completedAt = newStatus === 'completed' ? new Date().toISOString() : null;
  
  try {
    // Vérification optimisée de l'existence
    const { data: existingEntries } = await supabase
      .from('user_progress')
      .select('id')
      .eq('user_id', userId)
      .eq('chapter_id', chapterId)
      .limit(1);
    
    let result;
    
    if (existingEntries && existingEntries.length > 0) {
      console.log(`Updating existing entry to status: ${newStatus}`);
      const { data, error } = await supabase
        .from('user_progress')
        .update({ 
          status: newStatus,
          completed_at: completedAt
        })
        .eq('user_id', userId)
        .eq('chapter_id', chapterId)
        .select('id, status, completed_at');
      
      if (error) throw error;
      result = { success: true, data };
    } else {
      console.log(`Creating new entry with status: ${newStatus}`);
      const { data, error } = await supabase
        .from('user_progress')
        .insert([{ 
          user_id: userId,
          chapter_id: chapterId,
          status: newStatus,
          completed_at: completedAt
        }])
        .select('id, status, completed_at');
      
      if (error) throw error;
      result = { success: true, data };
    }
    
    // Invalider le cache après mise à jour
    invalidateProgressCache(userId, dayNumber);
    
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
