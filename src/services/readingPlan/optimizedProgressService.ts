
/**
 * Service de progression optimisé pour le plan de lecture
 * 
 * Ce service gère :
 * - La récupération de la progression utilisateur avec cache intelligent
 * - Les opérations de mise à jour (toggle) des statuts de lecture
 * - L'invalidation sélective du cache pour optimiser les performances
 * 
 * Optimisations incluses :
 * - Cache léger en mémoire pour réduire les requêtes Supabase
 * - Intégration avec le nouveau système de cache global
 * - Gestion d'erreurs robuste
 */

import { supabase } from "@/integrations/supabase/client";
import { UserProgress, ReadingPlanChapter } from "@/types/supabase";
import { toast } from "sonner";
import { invalidateUserCacheSelective, optimizedToggleChapterStatus as newOptimizedToggle } from "./optimizedCacheService";

/**
 * Cache léger en mémoire pour la compatibilité avec l'ancien code
 * Utilisé pour stocker temporairement les données de progression
 */
const lightCache = new Map<string, any>();
const LIGHT_CACHE_DURATION = 2 * 60 * 1000; // Cache valide pendant 2 minutes

/**
 * Récupère la progression de l'utilisateur pour un jour donné avec cache léger
 * 
 * @param userId - ID de l'utilisateur
 * @param dayNumber - Numéro du jour (1-365)
 * @returns Tableau de la progression utilisateur avec informations des chapitres
 */
export const getCachedUserProgressForDay = async (userId: string, dayNumber: number) => {
  const cacheKey = `light-progress-${userId}-${dayNumber}`;
  const cached = lightCache.get(cacheKey);
  
  // Vérifier si les données en cache sont encore valides
  if (cached && Date.now() - cached.timestamp < LIGHT_CACHE_DURATION) {
    return cached.data;
  }
  
  try {
    // Première requête : récupérer les IDs des chapitres pour ce jour
    const { data: chapters } = await supabase
      .from('reading_plan_chapters')
      .select('id')
      .eq('day_number', dayNumber);
    
    if (!chapters || chapters.length === 0) {
      // Mettre en cache un résultat vide si aucun chapitre trouvé
      lightCache.set(cacheKey, { data: [], timestamp: Date.now() });
      return [];
    }
    
    // Extraire les IDs des chapitres
    const chapterIds = chapters.map(chapter => chapter.id);
    
    // Deuxième requête : récupérer la progression pour ces chapitres
    const { data, error } = await supabase
      .from('user_progress')
      .select('id, user_id, chapter_id, status, completed_at, reading_plan_chapters!inner(id, reference)')
      .eq('user_id', userId)
      .in('chapter_id', chapterIds);
    
    if (error) throw error;
    
    // Mettre en cache le résultat
    lightCache.set(cacheKey, { data: data || [], timestamp: Date.now() });
    
    return data as (UserProgress & { reading_plan_chapters: ReadingPlanChapter })[];
  } catch (error) {
    console.error(`Erreur lors de la récupération de la progression pour le jour ${dayNumber}:`, error);
    return [];
  }
};

/**
 * Invalide le cache léger de progression
 * 
 * @param userId - ID de l'utilisateur
 * @param dayNumber - Numéro du jour spécifique (optionnel)
 */
export const invalidateProgressCache = (userId: string, dayNumber?: number) => {
  if (dayNumber) {
    // Invalider seulement le cache pour un jour spécifique
    const cacheKey = `light-progress-${userId}-${dayNumber}`;
    lightCache.delete(cacheKey);
  } else {
    // Invalider tout le cache pour cet utilisateur
    for (const key of lightCache.keys()) {
      if (key.startsWith(`light-progress-${userId}-`)) {
        lightCache.delete(key);
      }
    }
  }
  
  // Également invalider le cache global pour la cohérence
  invalidateUserCacheSelective(userId);
};

/**
 * Fonction de toggle optimisée utilisant le nouveau service de cache
 * Cette fonction est importée du service de cache optimisé
 */
export const optimizedToggleChapterStatus = newOptimizedToggle;
