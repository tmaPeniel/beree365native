
/**
 * Service de progression optimisé avec mise en cache avancée
 */

import { supabase } from "@/integrations/supabase/client";
import { UserProgress, ReadingPlanChapter } from "@/types/supabase";
import { toast } from "sonner";

// Cache optimisé avec gestion intelligente
const optimizedCache = new Map<string, any>();
const CACHE_DURATION = 3 * 60 * 1000; // 3 minutes

/**
 * Récupère la progression de l'utilisateur avec cache optimisé
 */
export const getCachedUserProgressForDay = async (userId: string, dayNumber: number) => {
  const cacheKey = `progress-${userId}-${dayNumber}`;
  const cached = optimizedCache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }
  
  try {
    // Requête optimisée avec select minimal
    const { data: chapters } = await supabase
      .from('reading_plan_chapters')
      .select('id')
      .eq('day_number', dayNumber);
    
    if (!chapters || chapters.length === 0) {
      optimizedCache.set(cacheKey, { data: [], timestamp: Date.now() });
      return [];
    }
    
    const chapterIds = chapters.map(chapter => chapter.id);
    
    const { data, error } = await supabase
      .from('user_progress')
      .select('id, user_id, chapter_id, status, completed_at, reading_plan_chapters!inner(id, reference)')
      .eq('user_id', userId)
      .in('chapter_id', chapterIds);
    
    if (error) throw error;
    
    // Cache optimisé
    optimizedCache.set(cacheKey, { data: data || [], timestamp: Date.now() });
    
    return data as (UserProgress & { reading_plan_chapters: ReadingPlanChapter })[];
  } catch (error) {
    console.error(`Error fetching user progress for day ${dayNumber}:`, error);
    return [];
  }
};

/**
 * Invalide le cache de manière sélective
 */
export const invalidateProgressCache = (userId: string, dayNumber?: number) => {
  if (dayNumber) {
    const cacheKey = `progress-${userId}-${dayNumber}`;
    optimizedCache.delete(cacheKey);
  } else {
    // Invalider seulement les entrées de cet utilisateur
    for (const key of optimizedCache.keys()) {
      if (key.startsWith(`progress-${userId}-`)) {
        optimizedCache.delete(key);
      }
    }
  }
};

/**
 * Toggle ultra-optimisé du statut d'un chapitre
 */
export const optimizedToggleChapterStatus = async (
  userId: string, 
  chapterId: string, 
  currentStatus: 'pending' | 'completed',
  dayNumber: number
) => {
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session) {
    toast.error("Vous devez être connecté pour modifier le statut de lecture");
    return { success: false, error: "User not authenticated" };
  }
  
  const newStatus = currentStatus === 'pending' ? 'completed' : 'pending';
  const completedAt = newStatus === 'completed' ? new Date().toISOString() : null;
  
  try {
    // Vérification ultra-optimisée
    const { data: existingEntries } = await supabase
      .from('user_progress')
      .select('id')
      .eq('user_id', userId)
      .eq('chapter_id', chapterId)
      .limit(1);
    
    let result;
    
    if (existingEntries && existingEntries.length > 0) {
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
    
    // Invalidation sélective du cache
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
