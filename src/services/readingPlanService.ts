
import { supabase } from "@/integrations/supabase/client";
import { ReadingPlanChapter, UserProgress, DailyVerse } from "@/types/supabase";

export const getReadingPlanForDay = async (dayNumber: number) => {
  try {
    const { data, error } = await supabase
      .from('reading_plan_chapters')
      .select('*')
      .eq('day_number', dayNumber)
      .order('reference');
    
    if (error) throw error;
    return data as ReadingPlanChapter[];
  } catch (error) {
    console.error(`Erreur lors de la récupération du plan pour le jour ${dayNumber}:`, error);
    return [];
  }
};

export const getUserProgressForDay = async (userId: string, dayNumber: number) => {
  try {
    const { data: chapters } = await supabase
      .from('reading_plan_chapters')
      .select('id')
      .eq('day_number', dayNumber);
    
    if (!chapters || chapters.length === 0) return [];
    
    const chapterIds = chapters.map(chapter => chapter.id);
    
    const { data, error } = await supabase
      .from('user_progress')
      .select('*, reading_plan_chapters!inner(*)')
      .eq('user_id', userId)
      .in('chapter_id', chapterIds);
    
    if (error) throw error;
    return data as (UserProgress & { reading_plan_chapters: ReadingPlanChapter })[];
  } catch (error) {
    console.error(`Erreur lors de la récupération de la progression pour le jour ${dayNumber}:`, error);
    return [];
  }
};

export const toggleChapterStatus = async (userId: string, chapterId: string, currentStatus: 'pending' | 'completed') => {
  const newStatus = currentStatus === 'pending' ? 'completed' : 'pending';
  const completedAt = newStatus === 'completed' ? new Date().toISOString() : null;
  
  try {
    const { data, error } = await supabase
      .from('user_progress')
      .update({ 
        status: newStatus,
        completed_at: completedAt
      })
      .eq('user_id', userId)
      .eq('chapter_id', chapterId);
    
    if (error) throw error;
    return { success: true, data };
  } catch (error: any) {
    console.error("Erreur lors de la mise à jour du statut:", error);
    return { success: false, error: error.message };
  }
};

export const getDailyVerse = async (dayNumber: number) => {
  try {
    const { data, error } = await supabase
      .from('daily_verses')
      .select('*')
      .eq('day_number', dayNumber)
      .single();
    
    if (error) {
      // Si le verset n'existe pas, retournons un verset par défaut
      if (error.code === 'PGRST116') {
        return {
          id: 'default',
          day_number: dayNumber,
          reference: 'Psaumes 119:105',
          text: 'Ta parole est une lampe à mes pieds, et une lumière sur mon sentier.'
        } as DailyVerse;
      }
      throw error;
    }
    
    return data as DailyVerse;
  } catch (error) {
    console.error(`Erreur lors de la récupération du verset du jour ${dayNumber}:`, error);
    return null;
  }
};

export const getDayProgress = async (userId: string, dayNumber: number) => {
  try {
    // Récupérer tous les chapitres pour ce jour
    const { data: chapters, error: chaptersError } = await supabase
      .from('reading_plan_chapters')
      .select('id')
      .eq('day_number', dayNumber);
    
    if (chaptersError) throw chaptersError;
    if (!chapters || chapters.length === 0) return 0;
    
    const chapterIds = chapters.map(chapter => chapter.id);
    
    // Récupérer les chapitres complétés
    const { data: completedChapters, error: progressError } = await supabase
      .from('user_progress')
      .select('*')
      .eq('user_id', userId)
      .in('chapter_id', chapterIds)
      .eq('status', 'completed');
    
    if (progressError) throw progressError;
    
    // Calculer le pourcentage
    const completedCount = completedChapters ? completedChapters.length : 0;
    const totalCount = chapters.length;
    const percentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
    
    return percentage;
  } catch (error) {
    console.error(`Erreur lors du calcul de la progression pour le jour ${dayNumber}:`, error);
    return 0;
  }
};

export const getOverallProgress = async (userId: string) => {
  try {
    // Récupérer le nombre total de chapitres
    const { count: totalCount, error: totalError } = await supabase
      .from('reading_plan_chapters')
      .select('*', { count: 'exact', head: true });
    
    if (totalError) throw totalError;
    
    // Récupérer le nombre de chapitres complétés
    const { count: completedCount, error: completedError } = await supabase
      .from('user_progress')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('status', 'completed');
    
    if (completedError) throw completedError;
    
    return {
      totalPassages: totalCount || 0,
      passagesRead: completedCount || 0,
      passagesRemaining: (totalCount || 0) - (completedCount || 0),
      progressPercentage: totalCount ? Math.round(((completedCount || 0) / totalCount) * 100) : 0
    };
  } catch (error) {
    console.error("Erreur lors du calcul de la progression globale:", error);
    return {
      totalPassages: 0,
      passagesRead: 0,
      passagesRemaining: 0,
      progressPercentage: 0
    };
  }
};

export const calculateDayNumber = (startDate: Date) => {
  const today = new Date();
  const start = new Date(startDate);
  
  // Réinitialiser les heures pour ne considérer que les jours
  today.setHours(0, 0, 0, 0);
  start.setHours(0, 0, 0, 0);
  
  const diffTime = today.getTime() - start.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  // Le jour 1 commence le jour de la date de début
  return diffDays + 1;
};
