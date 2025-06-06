/* eslint-disable @typescript-eslint/no-explicit-any */

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
const CACHE_DURATION = 5 * 60 * 2000; // 5 minutes - cache plus court pour plus de réactivité

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
    
    // REQUÊTE OPTIMISÉE : Récupérer TOUS les chapitres avec leur progression
    // Utiliser une limite élevée pour s'assurer de récupérer tous les chapitres
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
      .order('day_number', { ascending: true })
      .range(0,1500); // Limite généreuse pour s'assurer de tout récupérer
    
    if (error) throw error;

    console.log(`✅ Query returned ${chaptersWithProgress?.length || 0} chapters total`);
    
    // Vérifier la distribution des jours
    const dayDistribution = new Map();
    chaptersWithProgress?.forEach(chapter => {
      const day = chapter.day_number;
      dayDistribution.set(day, (dayDistribution.get(day) || 0) + 1);
    });
    
    console.log(`📊 Days coverage: ${dayDistribution.size} unique days (should be 365)`);
    const maxDay = Math.max(...dayDistribution.keys());
    console.log(`📊 Highest day number: ${maxDay}`);
    
    if (maxDay < 365) {
      console.warn(`⚠️ Missing days detected! Only have data up to day ${maxDay}`);
    }
    
    // Traitement ultra-optimisé des données avec génération complète des 365 jours
    const processedData = processChaptersDataOptimized(chaptersWithProgress || [], startDate);
    
    // Mise en cache globale
    globalCache.set(cacheKey, {
      data: processedData,
      timestamp: Date.now(),
      userId
    });
    
    console.log(`💾 Cached ${processedData.length} days of reading plan data`);
    return processedData;
  } catch (error) {
    console.error('❌ Error fetching ultra-optimized reading plan data:', error);
    toast.error('Erreur lors du chargement du plan de lecture');
    throw error;
  }
};

/**
 * Traite les données des chapitres de manière ultra-optimisée
 * ASSURE que tous les 365 jours sont générés
 */
const processChaptersDataOptimized = (chapters: any[], startDate: string) => {
  console.log(`🔄 Processing ${chapters.length} chapters...`);
  
  const dayGroups = new Map();
  
  // Traitement en une seule passe des chapitres existants
  chapters.forEach(chapter => {
    const dayNum = chapter.day_number;
    
    // Vérifier la validité du jour
    if (!dayNum || dayNum < 1 || dayNum > 365) {
      console.warn(`⚠️ Invalid day number: ${dayNum}`);
      return;
    }
    
    if (!dayGroups.has(dayNum)) {
      const calculatedDate = calculateDateForDay(startDate, dayNum);
      
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

  console.log(`📊 Created ${dayGroups.size} days with chapters`);

  // GÉNÉRER tous les jours manquants de 1 à 365
  for (let day = 1; day <= 365; day++) {
    if (!dayGroups.has(day)) {
      const calculatedDate = calculateDateForDay(startDate, day);
      
      dayGroups.set(day, {
        day: day,
        chapters: [], // Jour sans chapitres
        date: calculatedDate,
        isToday: isToday(startDate, day)
      });
    }
  }

  console.log(`📊 Final result: ${dayGroups.size} total days (should be 365)`);

  // Calculer la progression et trier par jour
  const result = Array.from(dayGroups.values())
    .sort((a, b) => a.day - b.day)
    .map(day => {
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

  // Vérification finale
  const daysWithoutChapters = result.filter(day => day.chapters.length === 0);
  if (daysWithoutChapters.length > 0) {
    console.log(`📊 Days without chapters: ${daysWithoutChapters.length}`);
    console.log(`📊 Sample days without chapters:`, daysWithoutChapters.slice(0, 10).map(d => d.day));
  }

  return result;
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
  console.log(`🔄 Toggle chapter - User: ${userId}, Chapter: ${chapterId}, Status: ${currentStatus} -> ${currentStatus === 'pending' ? 'completed' : 'pending'}`);
  
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
