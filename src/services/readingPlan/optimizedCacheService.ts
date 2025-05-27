
/**
 * Service de cache optimisé pour le plan de lecture
 * Gère un cache global avec invalidation sélective
 */

import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Cache global optimisé
interface CacheEntry {
  data: any;
  timestamp: number;
  userId: string;
}

const globalCache = new Map<string, CacheEntry>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Génère une clé de cache
 */
const getCacheKey = (userId: string, type: string, identifier?: string | number) => {
  return identifier 
    ? `${type}-${userId}-${identifier}` 
    : `${type}-${userId}`;
};

/**
 * Vérifie si une entrée de cache est valide
 */
const isCacheValid = (entry: CacheEntry) => {
  return Date.now() - entry.timestamp < CACHE_DURATION;
};

/**
 * Récupère toutes les données du plan de lecture en une seule requête optimisée
 */
export const getOptimizedReadingPlanData = async (userId: string, startDate: string) => {
  const cacheKey = getCacheKey(userId, 'full-reading-plan');
  const cached = globalCache.get(cacheKey);
  
  if (cached && isCacheValid(cached)) {
    console.log('Using cached full reading plan data');
    return cached.data;
  }
  
  try {
    console.log('Fetching optimized reading plan data...');
    
    // Une seule requête pour récupérer tout
    const { data: chaptersWithProgress, error } = await supabase
      .from('reading_plan_chapters')
      .select(`
        id, 
        day_number, 
        reference,
        user_progress!left(
          id,
          status,
          completed_at,
          user_id
        )
      `)
      .eq('user_progress.user_id', userId)
      .order('day_number', { ascending: true });
    
    if (error) throw error;

    // Traitement optimisé des données
    const processedData = processChaptersData(chaptersWithProgress || [], startDate);
    
    // Mise en cache
    globalCache.set(cacheKey, {
      data: processedData,
      timestamp: Date.now(),
      userId
    });
    
    console.log(`Cached ${processedData.length} days of reading plan data`);
    return processedData;
  } catch (error) {
    console.error('Error fetching optimized reading plan data:', error);
    throw error;
  }
};

/**
 * Traite les données des chapitres pour les organiser par jour
 */
const processChaptersData = (chapters: any[], startDate: string) => {
  const dayGroups = new Map();
  
  chapters.forEach(chapter => {
    const dayNum = chapter.day_number;
    if (!dayGroups.has(dayNum)) {
      dayGroups.set(dayNum, {
        day: dayNum,
        chapters: [],
        date: formatDate(startDate, dayNum - 1),
        isToday: isToday(startDate, dayNum - 1)
      });
    }
    
    const dayData = dayGroups.get(dayNum);
    dayData.chapters.push({
      id: chapter.id,
      reference: chapter.reference,
      completed: chapter.user_progress && chapter.user_progress.length > 0 
        ? chapter.user_progress[0].status === 'completed' 
        : false,
      progressId: chapter.user_progress && chapter.user_progress.length > 0 
        ? chapter.user_progress[0].id 
        : null
    });
  });

  // Calculer la progression pour chaque jour
  return Array.from(dayGroups.values()).map(day => {
    const completedChapters = day.chapters.filter(chapter => chapter.completed);
    const progressPercentage = day.chapters.length > 0 
      ? Math.round((completedChapters.length / day.chapters.length) * 100) 
      : 0;
    
    return {
      ...day,
      progressPercentage,
      completed: progressPercentage === 100
    };
  });
};

/**
 * Invalide le cache pour un utilisateur spécifique
 */
export const invalidateUserCache = (userId: string, type?: string) => {
  if (type) {
    const cacheKey = getCacheKey(userId, type);
    globalCache.delete(cacheKey);
  } else {
    // Invalider tout le cache pour cet utilisateur
    for (const key of globalCache.keys()) {
      if (key.includes(`-${userId}-`)) {
        globalCache.delete(key);
      }
    }
  }
};

/**
 * Toggle optimisé du statut d'un chapitre avec mise à jour de cache intelligente
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
    
    // Invalider seulement le cache du plan de lecture complet
    invalidateUserCache(userId, 'full-reading-plan');
    
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

// Fonctions utilitaires
const formatDate = (startDateStr: string, dayOffset: number) => {
  const startDate = new Date(startDateStr);
  startDate.setDate(startDate.getDate() + dayOffset);
  return startDate.toISOString().split('T')[0];
};

const isToday = (startDateStr: string, dayOffset: number) => {
  const startDate = new Date(startDateStr);
  startDate.setDate(startDate.getDate() + dayOffset);
  const today = new Date();
  return startDate.getDate() === today.getDate() && 
         startDate.getMonth() === today.getMonth() && 
         startDate.getFullYear() === today.getFullYear();
};
