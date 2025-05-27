
/**
 * Service de cache ultra-optimisé pour le plan de lecture
 * Une seule requête pour tout charger, cache global intelligent
 */

import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { calculateDateForDay, isToday } from "@/utils/dateCalculations";

// Cache global ultra-optimisé
interface GlobalCacheEntry {
  data: any;
  timestamp: number;
  userId: string;
}

const globalCache = new Map<string, GlobalCacheEntry>();
const CACHE_DURATION = 15 * 60 * 1000; // 15 minutes - cache plus long

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
const isCacheValid = (entry: GlobalCacheEntry) => {
  return Date.now() - entry.timestamp < CACHE_DURATION;
};

/**
 * Récupère toutes les données du plan de lecture en UNE SEULE requête ultra-optimisée
 */
export const getOptimizedReadingPlanData = async (userId: string, startDate: string) => {
  const cacheKey = getCacheKey(userId, 'ultra-optimized-reading-plan');
  const cached = globalCache.get(cacheKey);
  
  if (cached && isCacheValid(cached)) {
    console.log('📦 Using cached ultra-optimized reading plan data');
    return cached.data;
  }
  
  try {
    console.log('🔥 Executing SINGLE ultra-optimized query for all reading plan data...');
    
    // UNE SEULE requête pour récupérer TOUT avec jointure optimisée
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

    console.log(`✅ Single query returned ${chaptersWithProgress?.length || 0} chapters with progress`);

    // Traitement ultra-optimisé des données
    const processedData = processChaptersDataOptimized(chaptersWithProgress || [], startDate);
    
    // Mise en cache globale
    globalCache.set(cacheKey, {
      data: processedData,
      timestamp: Date.now(),
      userId
    });
    
    console.log(`💾 Cached ${processedData.length} days of ultra-optimized reading plan data`);
    return processedData;
  } catch (error) {
    console.error('❌ Error fetching ultra-optimized reading plan data:', error);
    throw error;
  }
};

/**
 * Traite les données des chapitres de manière ultra-optimisée
 */
const processChaptersDataOptimized = (chapters: any[], startDate: string) => {
  const dayGroups = new Map();
  
  // Traitement en une seule passe
  chapters.forEach(chapter => {
    const dayNum = chapter.day_number;
    if (!dayGroups.has(dayNum)) {
      const calculatedDate = calculateDateForDay(startDate, dayNum);
      console.log(`🗓️ Day ${dayNum} calculated date: ${calculatedDate}`);
      
      dayGroups.set(dayNum, {
        day: dayNum,
        chapters: [],
        date: calculatedDate,
        isToday: isToday(startDate, dayNum)
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

  // Calculer la progression en une seule passe
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
 * Invalide le cache de manière sélective et intelligente
 */
export const invalidateUserCacheSelective = (userId: string, type?: string) => {
  if (type) {
    const cacheKey = getCacheKey(userId, type);
    globalCache.delete(cacheKey);
    console.log(`🗑️ Invalidated cache for ${type} - ${userId}`);
  } else {
    // Invalider tout le cache pour cet utilisateur
    let deletedCount = 0;
    for (const key of globalCache.keys()) {
      if (key.includes(`-${userId}`)) {
        globalCache.delete(key);
        deletedCount++;
      }
    }
    console.log(`🗑️ Invalidated ${deletedCount} cache entries for user ${userId}`);
  }
};

/**
 * Toggle ultra-optimisé du statut d'un chapitre avec cache intelligent
 */
export const optimizedToggleChapterStatus = async (
  userId: string, 
  chapterId: string, 
  currentStatus: 'pending' | 'completed',
  dayNumber: number
) => {
  console.log(`🔄 Ultra-optimized toggle - User: ${userId}, Chapter: ${chapterId}, Current: ${currentStatus}`);
  
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session) {
    toast.error("Vous devez être connecté pour modifier le statut de lecture");
    return { success: false, error: "User not authenticated" };
  }
  
  const newStatus = currentStatus === 'pending' ? 'completed' : 'pending';
  const completedAt = newStatus === 'completed' ? new Date().toISOString() : null;
  
  try {
    // Vérification ultra-rapide de l'existence
    const { data: existingEntries } = await supabase
      .from('user_progress')
      .select('id')
      .eq('user_id', userId)
      .eq('chapter_id', chapterId)
      .limit(1);
    
    let result;
    
    if (existingEntries && existingEntries.length > 0) {
      console.log(`📝 Updating existing entry to status: ${newStatus}`);
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
      console.log(`➕ Creating new entry with status: ${newStatus}`);
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
    
    // Invalidation sélective - seulement le cache global
    invalidateUserCacheSelective(userId, 'ultra-optimized-reading-plan');
    
    toast.success(newStatus === 'completed' ? 
      "Passage marqué comme lu" : 
      "Passage marqué comme non lu"
    );
    
    return result;
  } catch (error: any) {
    console.error("❌ Error toggling chapter status:", error);
    toast.error(`Une erreur est survenue: ${error.message}`);
    return { success: false, error: error.message };
  }
};

// Fonction utilitaire corrigée pour calculer la date en cohérence avec useCurrentDay
const formatDateOptimized = (startDateStr: string, dayNumber: number) => {
  const startDate = new Date(startDateStr);
  startDate.setHours(0, 0, 0, 0);
  
  // Calculer la date en utilisant la même logique que useCurrentDay
  // dayNumber correspond au jour du plan (1-365), donc on ajoute dayNumber - 1 jours
  const targetDate = new Date(startDate);
  targetDate.setDate(startDate.getDate() + (dayNumber - 1));
  
  return targetDate.toISOString().split('T')[0];
};

const isTodayOptimized = (startDateStr: string, dayNumber: number) => {
  const calculatedDate = formatDateOptimized(startDateStr, dayNumber);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const targetDate = new Date(calculatedDate);
  targetDate.setHours(0, 0, 0, 0);
  
  return targetDate.getTime() === today.getTime();
};
