
/**
 * Service de progression unifié
 * Remplace et consolide tous les anciens services de progression
 * Utilise le cache global pour assurer la cohérence entre tous les composants
 */

import { supabase } from "@/integrations/supabase/client";
import { UserProgress, ReadingPlanChapter } from "@/types/supabase";
import { toast } from "sonner";
import { 
  invalidateUserCacheSelective, 
  optimizedToggleChapterStatus as cacheToggleChapterStatus,
  getOptimizedReadingPlanData 
} from "./optimizedCacheService";

/**
 * Interface pour les données de progression d'un jour
 */
export interface DayProgressData {
  dayNumber: number;
  totalChapters: number;
  completedChapters: number;
  progressPercentage: number;
  chapters: Array<{
    id: string;
    reference: string;
    isCompleted: boolean;
    completedAt?: string;
  }>;
}

/**
 * Récupère la progression de l'utilisateur pour un jour donné
 * Utilise le cache global pour la cohérence
 */
export const getUnifiedUserProgressForDay = async (userId: string, dayNumber: number, startDate?: string): Promise<DayProgressData> => {
  try {
    console.log(`📖 Récupération progression unifiée jour ${dayNumber} pour utilisateur ${userId}`);
    
    if (startDate) {
      // Utiliser le cache global si possible
      const optimizedData = await getOptimizedReadingPlanData(userId, startDate);
      const dayData = optimizedData.find(day => day.day === dayNumber);
      
      if (dayData) {
        return {
          dayNumber,
          totalChapters: dayData.chapters.length,
          completedChapters: dayData.chapters.filter(ch => ch.isCompleted).length,
          progressPercentage: dayData.progressPercentage,
          chapters: dayData.chapters.map(ch => ({
            id: ch.id,
            reference: ch.reference,
            isCompleted: ch.isCompleted,
            completedAt: ch.completedAt
          }))
        };
      }
    }
    
    // Fallback vers requête directe
    const { data: chapters } = await supabase
      .from('reading_plan_chapters')
      .select('id, reference, description')
      .eq('day_number', dayNumber)
      .order('reference');
    
    if (!chapters || chapters.length === 0) {
      return {
        dayNumber,
        totalChapters: 0,
        completedChapters: 0,
        progressPercentage: 0,
        chapters: []
      };
    }
    
    const chapterIds = chapters.map(chapter => chapter.id);
    
    const { data: userProgress } = await supabase
      .from('user_progress')
      .select('chapter_id, status, completed_at')
      .eq('user_id', userId)
      .in('chapter_id', chapterIds);
    
    const progressMap = new Map(
      userProgress?.map(p => [p.chapter_id, p]) || []
    );
    
    const chaptersWithProgress = chapters.map(chapter => {
      const progress = progressMap.get(chapter.id);
      return {
        id: chapter.id,
        reference: chapter.reference,
        isCompleted: progress?.status === 'completed',
        completedAt: progress?.completed_at
      };
    });
    
    const completedCount = chaptersWithProgress.filter(ch => ch.isCompleted).length;
    const progressPercentage = Math.round((completedCount / chapters.length) * 100);
    
    return {
      dayNumber,
      totalChapters: chapters.length,
      completedChapters: completedCount,
      progressPercentage,
      chapters: chaptersWithProgress
    };
    
  } catch (error) {
    console.error(`Erreur récupération progression jour ${dayNumber}:`, error);
    return {
      dayNumber,
      totalChapters: 0,
      completedChapters: 0,
      progressPercentage: 0,
      chapters: []
    };
  }
};

/**
 * Toggle le statut d'un chapitre de manière unifiée
 * Utilise le cache global et synchronise tous les composants
 */
export const unifiedToggleChapterStatus = async (
  userId: string, 
  chapterId: string, 
  currentStatus: 'pending' | 'completed'
): Promise<boolean> => {
  try {
    console.log(`🔄 Toggle unifié chapitre ${chapterId}, statut actuel: ${currentStatus}`);
    
    // Utiliser le toggle optimisé du cache global
    const success = await cacheToggleChapterStatus(userId, chapterId, currentStatus);
    
    if (success) {
      const newStatus = currentStatus === 'completed' ? 'pending' : 'completed';
      const action = newStatus === 'completed' ? 'marqué comme lu' : 'marqué comme non lu';
      
      toast.success(`Chapitre ${action}`);
      
      // Invalider le cache pour synchroniser tous les composants
      invalidateUserCacheSelective(userId);
      
      console.log(`✅ Toggle unifié réussi pour chapitre ${chapterId}`);
      return true;
    }
    
    toast.error("Erreur lors de la mise à jour");
    return false;
    
  } catch (error) {
    console.error(`Erreur toggle unifié chapitre ${chapterId}:`, error);
    toast.error("Erreur lors de la mise à jour");
    return false;
  }
};

/**
 * Calcule le pourcentage de progression pour un jour donné
 * Version rapide pour les composants qui n'ont besoin que du pourcentage
 */
export const getUnifiedDayProgress = async (userId: string, dayNumber: number): Promise<number> => {
  try {
    const dayData = await getUnifiedUserProgressForDay(userId, dayNumber);
    return dayData.progressPercentage;
  } catch (error) {
    console.error(`Erreur calcul progression jour ${dayNumber}:`, error);
    return 0;
  }
};

/**
 * Invalide tous les caches de progression
 * À utiliser après des modifications importantes
 */
export const invalidateAllProgressCaches = (userId: string) => {
  console.log(`🔄 Invalidation complète des caches de progression pour ${userId}`);
  invalidateUserCacheSelective(userId);
};

/**
 * Récupère la progression globale de l'utilisateur
 * Compatible avec l'ancien code
 */
export const getUnifiedOverallProgress = async (userId: string, startDate: string) => {
  try {
    const optimizedData = await getOptimizedReadingPlanData(userId, startDate);
    
    if (!optimizedData || optimizedData.length === 0) {
      return {
        passagesRead: 0,
        progressPercentage: 0
      };
    }
    
    const totalCompleted = optimizedData.reduce((sum, day) => {
      return sum + day.chapters.filter(ch => ch.isCompleted).length;
    }, 0);
    
    const totalChapters = optimizedData.reduce((sum, day) => {
      return sum + day.chapters.length;
    }, 0);
    
    const progressPercentage = totalChapters > 0 ? Math.round((totalCompleted / totalChapters) * 100) : 0;
    
    return {
      passagesRead: totalCompleted,
      progressPercentage
    };
    
  } catch (error) {
    console.error("Erreur calcul progression globale:", error);
    return {
      passagesRead: 0,
      progressPercentage: 0
    };
  }
};
