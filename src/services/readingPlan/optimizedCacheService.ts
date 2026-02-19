
/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Service de cache ultra-optimisé pour le plan de lecture
 * VERSION CORRIGÉE - Cache unifié et réactif
 * 
 * Corrections apportées :
 * - Configuration de cache plus réactive
 * - Invalidation corrigée avec refetch actif
 * - Logs de debugging détaillés
 * - Gestion d'erreurs améliorée
 */

import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { calculateDateForDay, isToday } from "@/utils/dateCalculations";

// Cache global CORRIGÉ avec durée réduite
interface GlobalCacheEntry {
  data: any;
  timestamp: number;
  userId: string;
}

const globalCache = new Map<string, GlobalCacheEntry>();
const CACHE_DURATION = 2 * 60 * 1000; // RÉDUIT : 2 minutes au lieu de 5
const DEBUG_MODE = false; // Activer les logs de debugging

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
  const isValid = Date.now() - entry.timestamp < CACHE_DURATION;
  
  if (DEBUG_MODE) {
    console.log(`🔍 [CACHE] Validity check:`, {
      age: Math.round((Date.now() - entry.timestamp) / 1000),
      maxAge: Math.round(CACHE_DURATION / 1000),
      isValid
    });
  }
  
  return isValid;
};

/**
 * Récupère toutes les données du plan de lecture - VERSION CORRIGÉE avec filtrage par plan
 */
export const getOptimizedReadingPlanData = async (userId: string, startDate: string) => {
  // D'abord récupérer le plan sélectionné de l'utilisateur
  const { data: profileData, error: profileError } = await supabase
    .from('profiles')
    .select(`
      selected_plan_id,
      reading_plans:selected_plan_id (
        duration_days
      )
    `)
    .eq('id', userId)
    .maybeSingle();

  if (profileError) {
    console.error('❌ [ERROR] Error fetching user profile:', profileError);
    throw profileError;
  }

  if (!profileData?.selected_plan_id) {
    if (DEBUG_MODE) {
      console.log('⚠️ [WARNING] No selected plan found for user, returning empty data');
    }
    toast.error('Aucun plan de lecture sélectionné. Veuillez choisir un plan dans votre profil.');
    return [];
  }

  const selectedPlanId = profileData.selected_plan_id;
  const planDuration = profileData.reading_plans?.duration_days || 365;
  const cacheKey = getCacheKey(userId, 'ultra-optimized-reading-plan', selectedPlanId);
  const cached = globalCache.get(cacheKey);
  
  if (cached && isCacheValid(cached)) {
    if (DEBUG_MODE) {
      console.log('📦 [CACHE] Using cached ultra-optimized reading plan data for plan:', selectedPlanId);
    }
    return cached.data;
  }
  
  try {
    if (DEBUG_MODE) {
      console.log('🔥 [FETCH] Executing SINGLE ultra-optimized query for plan:', selectedPlanId);
    }
    
    // REQUÊTE OPTIMISÉE avec filtrage par plan sélectionné ET par utilisateur
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
      .eq('plan_id', selectedPlanId)
      .eq('user_progress.user_id', userId)
      .order('day_number', { ascending: true })
      .range(0, 1500);
    
    if (error) {
      console.error('❌ [ERROR] Supabase query failed:', error);
      throw error;
    }

    if (DEBUG_MODE) {
      console.log(`✅ [FETCH] Query returned ${chaptersWithProgress?.length || 0} chapters total`);
      
      // Vérification de la distribution des jours
      const dayDistribution = new Map();
      chaptersWithProgress?.forEach(chapter => {
        const day = chapter.day_number;
        dayDistribution.set(day, (dayDistribution.get(day) || 0) + 1);
      });
      
      console.log(`📊 [STATS] Days coverage: ${dayDistribution.size} unique days (should be ${planDuration})`);
      const maxDay = Math.max(...dayDistribution.keys());
      console.log(`📊 [STATS] Highest day number: ${maxDay}`);
      
      if (maxDay < planDuration) {
        console.warn(`⚠️ [WARNING] Missing days detected! Only have data up to day ${maxDay}`);
      }
    }
    
    // Traitement des données avec logs détaillés
    const processedData = processChaptersDataOptimized(chaptersWithProgress || [], startDate, planDuration);
    
    // Mise en cache CORRIGÉE avec plan ID
    globalCache.set(cacheKey, {
      data: processedData,
      timestamp: Date.now(),
      userId
    });
    
    if (DEBUG_MODE) {
      console.log(`💾 [CACHE] Cached ${processedData.length} days of reading plan data`);
    }
    
    return processedData;
  } catch (error) {
    console.error('❌ [ERROR] Error fetching ultra-optimized reading plan data:', error);
    toast.error('Erreur lors du chargement du plan de lecture');
    throw error;
  }
};

/**
 * Traite les données des chapitres - VERSION AVEC DEBUGGING
 */
const processChaptersDataOptimized = (chapters: any[], startDate: string, planDuration: number = 365) => {
  if (DEBUG_MODE) {
    console.log(`🔄 [PROCESS] Processing ${chapters.length} chapters...`);
  }
  
  const dayGroups = new Map();
  
  // Traitement des chapitres existants avec logs
  chapters.forEach(chapter => {
    const dayNum = chapter.day_number;
    
    if (!dayNum || dayNum < 1 || dayNum > planDuration) {
      console.warn(`⚠️ [WARNING] Invalid day number: ${dayNum}`);
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

  if (DEBUG_MODE) {
    console.log(`📊 [PROCESS] Created ${dayGroups.size} days with chapters`);
  }

  // Générer tous les jours manquants
  for (let day = 1; day <= planDuration; day++) {
    if (!dayGroups.has(day)) {
      const calculatedDate = calculateDateForDay(startDate, day);
      
      dayGroups.set(day, {
        day: day,
        chapters: [],
        date: calculatedDate,
        isToday: isToday(startDate, day)
      });
    }
  }

  // Calculer la progression et trier
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

  if (DEBUG_MODE) {
    console.log(`📊 [PROCESS] Final result: ${result.length} total days (should be 365)`);
    
    const daysWithoutChapters = result.filter(day => day.chapters.length === 0);
    if (daysWithoutChapters.length > 0) {
      console.log(`📊 [STATS] Days without chapters: ${daysWithoutChapters.length}`);
      console.log(`📊 [STATS] Sample days without chapters:`, daysWithoutChapters.slice(0, 10).map(d => d.day));
    }
  }

  return result;
};

/**
 * Invalide le cache - VERSION CORRIGÉE avec support des plans
 */
export const invalidateUserCacheSelective = (userId: string, type?: string) => {
  if (type) {
    // Invalider toutes les entrées de cache qui commencent par le type et l'utilisateur
    let deletedCount = 0;
    for (const key of globalCache.keys()) {
      if (key.startsWith(`${type}-${userId}`)) {
        globalCache.delete(key);
        deletedCount++;
      }
    }
    
    if (DEBUG_MODE) {
      console.log(`🗑️ [CACHE] Invalidated ${deletedCount} cache entries for ${type} - ${userId}`);
    }
  } else {
    let deletedCount = 0;
    for (const key of globalCache.keys()) {
      if (key.includes(`-${userId}`)) {
        globalCache.delete(key);
        deletedCount++;
      }
    }
    
    if (DEBUG_MODE) {
      console.log(`🗑️ [CACHE] Invalidated ${deletedCount} cache entries for user ${userId}`);
    }
  }
};

/**
 * Toggle CORRIGÉ du statut d'un chapitre avec debugging
 */
export const optimizedToggleChapterStatus = async (
  userId: string, 
  chapterId: string, 
  currentStatus: 'pending' | 'completed',
  dayNumber: number,
  silent: boolean = false
) => {
  if (DEBUG_MODE) {
    console.log(`🔄 [TOGGLE] Chapter toggle - User: ${userId}, Chapter: ${chapterId}, Status: ${currentStatus} -> ${currentStatus === 'pending' ? 'completed' : 'pending'}`);
  }
  
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session) {
    console.error('❌ [ERROR] User not authenticated');
    if (!silent) {
      toast.error("Vous devez être connecté pour modifier le statut de lecture");
    }
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
      if (DEBUG_MODE) {
        console.log(`📝 [UPDATE] Updating existing entry to status: ${newStatus}`);
      }
      
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
      if (DEBUG_MODE) {
        console.log(`➕ [CREATE] Creating new entry with status: ${newStatus}`);
      }
      
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
    
    // Mettre à jour l'activité utilisateur pour toute action de toggle (cocher/décocher)
    // Import dynamique pour éviter les dépendances circulaires
    const { ActivityService } = await import('../auth/activityService');
    await ActivityService.updateUserActivity(userId);
    
    // Invalidation CORRIGÉE - cache global seulement
    invalidateUserCacheSelective(userId, 'ultra-optimized-reading-plan');
    
    if (DEBUG_MODE) {
      console.log(`✅ [SUCCESS] Chapter toggle completed successfully`);
    }
    
    if (!silent) {
      toast.success(newStatus === 'completed' ? 
        "Passage marqué comme lu" : 
        "Passage marqué comme non lu"
      );
    }
    
    return result;
  } catch (error: any) {
    console.error("❌ [ERROR] Error toggling chapter status:", error);
    if (!silent) {
      toast.error(`Une erreur est survenue: ${error.message}`);
    }
    return { success: false, error: error.message };
  }
};

/**
 * Marque tous les chapitres d'une liste comme lus en une seule opération
 */
export const markAllChaptersAsRead = async (
  userId: string,
  chapterIds: string[],
  dayNumber: number
) => {
  if (DEBUG_MODE) {
    console.log(`🔄 [BULK TOGGLE] Marking ${chapterIds.length} chapters as read for user ${userId}`);
  }

  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session) {
    console.error('❌ [ERROR] User not authenticated');
    return { success: false, error: "User not authenticated" };
  }

  const completedAt = new Date().toISOString();

  try {
    // Récupérer les entrées existantes
    const { data: existingEntries } = await supabase
      .from('user_progress')
      .select('id, chapter_id')
      .eq('user_id', userId)
      .in('chapter_id', chapterIds);

    const existingChapterIds = existingEntries?.map(entry => entry.chapter_id) || [];
    const newChapterIds = chapterIds.filter(id => !existingChapterIds.includes(id));

    // Mettre à jour les entrées existantes
    if (existingChapterIds.length > 0) {
      const { error: updateError } = await supabase
        .from('user_progress')
        .update({ 
          status: 'completed',
          completed_at: completedAt
        })
        .eq('user_id', userId)
        .in('chapter_id', existingChapterIds);

      if (updateError) throw updateError;
    }

    // Créer de nouvelles entrées
    if (newChapterIds.length > 0) {
      const newEntries = newChapterIds.map(chapterId => ({
        user_id: userId,
        chapter_id: chapterId,
        status: 'completed' as const,
        completed_at: completedAt
      }));

      const { error: insertError } = await supabase
        .from('user_progress')
        .insert(newEntries);

      if (insertError) throw insertError;
    }

    // Mettre à jour l'activité utilisateur
    const { ActivityService } = await import('../auth/activityService');
    await ActivityService.updateUserActivity(userId);

    // Invalidation du cache
    invalidateUserCacheSelective(userId, 'ultra-optimized-reading-plan');

    if (DEBUG_MODE) {
      console.log(`✅ [SUCCESS] Bulk chapter marking completed successfully`);
    }

    return { success: true };
  } catch (error: any) {
    console.error("❌ [ERROR] Error marking chapters as read:", error);
    return { success: false, error: error.message };
  }
};
