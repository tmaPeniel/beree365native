/**
 * Service unifié pour la gestion de la progression utilisateur
 * Centralise toute la logique de progression avec cache optimisé
 */

import { supabase } from "@/integrations/supabase/client";
import { UserProgress, ReadingPlanChapter } from "@/types/supabase";
import { toast } from "sonner";
import { queryClient } from "@/lib/queryClient"; // Import corrigé du query client centralisé

/**
 * Type pour la progression d'un jour avec les informations des chapitres
 */
export type DayProgressWithChapters = UserProgress & { 
  reading_plan_chapters: ReadingPlanChapter;
};

/**
 * Récupère la progression de l'utilisateur pour un jour donné
 * Optimisé avec la gestion du cache
 * @param userId - ID de l'utilisateur
 * @param dayNumber - Numéro du jour (1-365)
 * @returns Progression avec les informations des chapitres
 */
export const getUnifiedUserProgressForDay = async (
  userId: string, 
  dayNumber: number
): Promise<DayProgressWithChapters[]> => {
  try {
    if (!userId) {
      console.error("❌ getUnifiedUserProgressForDay: Aucun ID utilisateur fourni");
      return [];
    }
    
    console.log(`📖 Récupération de la progression pour l'utilisateur ${userId} - Jour ${dayNumber}`);
    
    // 1. Récupérer tous les chapitres pour ce jour
    const { data: chapters, error: chaptersError } = await supabase
      .from('reading_plan_chapters')
      .select('*')
      .eq('day_number', dayNumber)
      .order('id');
    
    if (chaptersError) {
      console.error(`❌ Erreur lors de la récupération des chapitres pour le jour ${dayNumber}:`, chaptersError);
      throw chaptersError;
    }
    
    if (!chapters || chapters.length === 0) {
      console.log(`📖 Aucun chapitre trouvé pour le jour ${dayNumber}`);
      return [];
    }
    
    console.log(`📖 ${chapters.length} chapitres trouvés pour le jour ${dayNumber}`);
    
    // 2. Récupérer la progression existante de l'utilisateur
    const chapterIds = chapters.map(chapter => chapter.id);
    const { data: progressData, error: progressError } = await supabase
      .from('user_progress')
      .select('*')
      .eq('user_id', userId)
      .in('chapter_id', chapterIds);
    
    if (progressError) {
      console.error(`❌ Erreur lors de la récupération de la progression:`, progressError);
      throw progressError;
    }
    
    console.log(`📖 ${progressData?.length || 0} entrées de progression trouvées`);
    
    // 3. Combiner les chapitres avec leur progression (statut par défaut: 'pending')
    const result: DayProgressWithChapters[] = chapters.map(chapter => {
      const progressItem = progressData?.find(p => p.chapter_id === chapter.id);
      
      return {
        id: progressItem?.id || `temp-${chapter.id}`,
        user_id: userId,
        chapter_id: chapter.id,
        status: progressItem?.status || 'pending' as const,
        completed_at: progressItem?.completed_at || null,
        reading_plan_chapters: chapter
      };
    });
    
    console.log(`📖 ${result.length} entrées de progression créées avec succès`);
    return result;
    
  } catch (error) {
    console.error(`❌ Erreur lors de la récupération de la progression pour le jour ${dayNumber}:`, error);
    return [];
  }
};

/**
 * Bascule le statut d'un chapitre entre 'pending' et 'completed'
 * Optimisé avec invalidation du cache pour synchronisation globale
 * @param userId - ID de l'utilisateur
 * @param chapterId - ID du chapitre
 * @param currentStatus - Statut actuel du chapitre
 * @returns Résultat de l'opération avec les données mises à jour
 */
export const toggleUnifiedChapterStatus = async (
  userId: string, 
  chapterId: string, 
  currentStatus: 'pending' | 'completed'
) => {
  console.log(`🔄 Basculement du statut - Utilisateur: ${userId}, Chapitre: ${chapterId}, Statut actuel: ${currentStatus}`);
  
  // Vérification de l'authentification
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session) {
    console.error("❌ toggleUnifiedChapterStatus: Utilisateur non authentifié");
    toast.error("Vous devez être connecté pour modifier le statut de lecture");
    return { success: false, error: "User not authenticated" };
  }
  
  const newStatus = currentStatus === 'pending' ? 'completed' : 'pending';
  const completedAt = newStatus === 'completed' ? new Date().toISOString() : null;
  
  try {
    // 1. Vérifier si une entrée existe déjà
    console.log(`🔍 Vérification de l'existence d'une entrée pour l'utilisateur ${userId} et le chapitre ${chapterId}`);
    const { data: existingEntries, error: checkError } = await supabase
      .from('user_progress')
      .select('*')
      .eq('user_id', userId)
      .eq('chapter_id', chapterId);
      
    if (checkError) {
      console.error("❌ Erreur lors de la vérification des entrées existantes:", checkError);
      toast.error("Erreur lors de la vérification de votre progression");
      return { success: false, error: checkError.message };
    }
    
    console.log(`🔍 ${existingEntries?.length || 0} entrées existantes trouvées`);
    
    let result;
    
    if (existingEntries && existingEntries.length > 0) {
      // 2a. Mettre à jour l'entrée existante
      console.log(`📝 Mise à jour de l'entrée existante vers le statut: ${newStatus}`);
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
        console.error("❌ Erreur lors de la mise à jour du statut:", error);
        toast.error(`Erreur lors de la mise à jour: ${error.message}`);
        throw error;
      }
      
      console.log("✅ Mise à jour réussie:", data);
      result = { success: true, data };
    } else {
      // 2b. Créer une nouvelle entrée
      console.log(`📝 Création d'une nouvelle entrée avec le statut: ${newStatus}`);
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
        console.error("❌ Erreur lors de la création de la nouvelle entrée:", error);
        toast.error(`Erreur lors de la création: ${error.message}`);
        throw error;
      }
      
      console.log("✅ Insertion réussie:", data);
      result = { success: true, data };
    }
    
    // 3. Invalider le cache pour synchroniser tous les composants
    console.log("🔄 Invalidation du cache pour synchronisation globale");
    await invalidateProgressCache(userId);
    
    // 4. Notifier l'utilisateur
    toast.success(newStatus === 'completed' ? 
      "Passage marqué comme lu ✅" : 
      "Passage marqué comme non lu ⏳"
    );
    
    return result;
    
  } catch (error: any) {
    console.error("❌ Erreur lors du basculement du statut du chapitre:", error);
    toast.error(`Une erreur est survenue: ${error.message}`);
    return { success: false, error: error.message };
  }
};

/**
 * Invalide le cache pour synchroniser tous les composants
 * @param userId - ID de l'utilisateur
 */
export const invalidateProgressCache = async (userId: string) => {
  try {
    console.log("🗂️ Invalidation du cache de progression...");
    
    // Invalider tous les caches liés à la progression
    await queryClient.invalidateQueries({
      predicate: (query) => {
        const queryKey = query.queryKey;
        return (
          queryKey.includes('userProgress') ||
          queryKey.includes('userStats') ||
          queryKey.includes('dayProgress') ||
          queryKey.includes(userId)
        );
      }
    });
    
    console.log("✅ Cache invalidé avec succès");
  } catch (error) {
    console.error("❌ Erreur lors de l'invalidation du cache:", error);
  }
};

/**
 * Récupère la progression pour plusieurs jours (optimisé pour le cache)
 * @param userId - ID de l'utilisateur
 * @param dayNumbers - Liste des numéros de jours
 * @returns Map avec la progression par jour
 */
export const getMultipleDaysProgress = async (
  userId: string, 
  dayNumbers: number[]
): Promise<Map<number, DayProgressWithChapters[]>> => {
  try {
    console.log(`📚 Récupération de la progression pour ${dayNumbers.length} jours`);
    
    const progressMap = new Map<number, DayProgressWithChapters[]>();
    
    // Récupérer la progression pour chaque jour
    const promises = dayNumbers.map(async (dayNumber) => {
      const progress = await getUnifiedUserProgressForDay(userId, dayNumber);
      return { dayNumber, progress };
    });
    
    const results = await Promise.all(promises);
    
    // Construire la map
    results.forEach(({ dayNumber, progress }) => {
      progressMap.set(dayNumber, progress);
    });
    
    console.log(`📚 Progression récupérée pour ${progressMap.size} jours`);
    return progressMap;
    
  } catch (error) {
    console.error("❌ Erreur lors de la récupération de la progression multiple:", error);
    return new Map();
  }
};
