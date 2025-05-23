/**
 * Service du plan de lecture
 * Gère toutes les interactions avec les données du plan de lecture dans Supabase
 */

import { supabase } from "@/integrations/supabase/client";
import { ReadingPlanChapter, UserProgress, DailyVerse } from "@/types/supabase";
import { toast } from "sonner";

/**
 * Récupère les chapitres du plan de lecture pour un jour donné
 * @param {number} dayNumber Numéro du jour
 * @returns {Promise<ReadingPlanChapter[]>}
 */
export const getReadingPlanForDay = async (dayNumber: number) => {
  try {
    console.log(`Fetching reading plan for day ${dayNumber}...`);
    const { data, error } = await supabase
      .from('reading_plan_chapters')
      .select('*')
      .eq('day_number', dayNumber)
      .order('reference');
    
    if (error) {
      console.error(`Error fetching reading plan for day ${dayNumber}:`, error);
      throw error;
    }
    
    console.log(`Successfully fetched ${data?.length || 0} chapters for day ${dayNumber}`);
    return data as ReadingPlanChapter[];
  } catch (error) {
    console.error(`Error fetching reading plan for day ${dayNumber}:`, error);
    return [];
  }
};

/**
 * Récupère la progression de l'utilisateur pour un jour donné
 * @param {string} userId ID de l'utilisateur
 * @param {number} dayNumber Numéro du jour
 * @returns {Promise<Array<UserProgress & {reading_plan_chapters: ReadingPlanChapter}>>}
 */
export const getUserProgressForDay = async (userId: string, dayNumber: number) => {
  try {
    if (!userId) {
      console.error("getUserProgressForDay: No user ID provided");
      return [];
    }
    
    console.log(`Fetching user progress for user ${userId} and day ${dayNumber}...`);
    
    const { data: chapters } = await supabase
      .from('reading_plan_chapters')
      .select('id')
      .eq('day_number', dayNumber);
    
    if (!chapters || chapters.length === 0) {
      console.log(`No chapters found for day ${dayNumber}`);
      return [];
    }
    
    const chapterIds = chapters.map(chapter => chapter.id);
    console.log(`Found ${chapterIds.length} chapter IDs for day ${dayNumber}`);
    
    const { data, error } = await supabase
      .from('user_progress')
      .select('*, reading_plan_chapters!inner(*)')
      .eq('user_id', userId)
      .in('chapter_id', chapterIds);
    
    if (error) {
      console.error(`Error fetching user progress for day ${dayNumber}:`, error);
      throw error;
    }
    
    console.log(`Successfully fetched ${data?.length || 0} progress entries for user ${userId} and day ${dayNumber}`);
    return data as (UserProgress & { reading_plan_chapters: ReadingPlanChapter })[];
  } catch (error) {
    console.error(`Error fetching user progress for day ${dayNumber}:`, error);
    return [];
  }
};

/**
 * Change le statut d'un chapitre entre 'pending' et 'completed'
 * @param {string} userId ID de l'utilisateur
 * @param {string} chapterId ID du chapitre
 * @param {ChapterStatus} currentStatus Statut actuel
 * @returns {Promise<{success: boolean, data?: any, error?: string}>}
 */
export const toggleChapterStatus = async (userId: string, chapterId: string, currentStatus: 'pending' | 'completed') => {
  console.log(`Toggling chapter status - User: ${userId}, Chapter: ${chapterId}, Current status: ${currentStatus}`);
  
  // Vérifier l'authentification
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session) {
    console.error("toggleChapterStatus: User not authenticated");
    toast.error("Vous devez être connecté pour modifier le statut de lecture");
    return { success: false, error: "User not authenticated" };
  }
  
  const newStatus = currentStatus === 'pending' ? 'completed' : 'pending';
  const completedAt = newStatus === 'completed' ? new Date().toISOString() : null;
  
  try {
    // Vérifier que l'entrée existe
    console.log(`Checking if entry exists for user ${userId} and chapter ${chapterId}...`);
    const { data: existingEntries, error: checkError } = await supabase
      .from('user_progress')
      .select('*')
      .eq('user_id', userId)
      .eq('chapter_id', chapterId);
      
    if (checkError) {
      console.error("Error checking existing entries:", checkError);
      toast.error("Erreur lors de la vérification de votre progression");
      return { success: false, error: checkError.message };
    }
    
    console.log(`Found ${existingEntries?.length || 0} existing entries`);
    
    let result;
    
    if (existingEntries && existingEntries.length > 0) {
      console.log(`Updating existing entry to status: ${newStatus}`);
      // Mettre à jour l'entrée existante
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
        console.error("Error updating status:", error);
        toast.error(`Erreur lors de la mise à jour: ${error.message}`);
        throw error;
      }
      
      console.log("Update successful:", data);
      result = { success: true, data };
    } else {
      console.log(`Creating new entry with status: ${newStatus}`);
      // Créer une nouvelle entrée
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
        console.error("Error creating new entry:", error);
        toast.error(`Erreur lors de la création: ${error.message}`);
        throw error;
      }
      
      console.log("Insert successful:", data);
      result = { success: true, data };
    }
    
    // Notifier l'utilisateur
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

/**
 * Récupère le verset du jour pour un jour donné
 * @param {number} dayNumber Numéro du jour
 * @returns {Promise<DailyVerse|null>}
 */
export const getDailyVerse = async (dayNumber: number) => {
  try {
    console.log(`Fetching verse for day ${dayNumber}...`);
    
    if (!dayNumber || dayNumber < 1 || dayNumber > 365) {
      console.warn(`Invalid day number provided: ${dayNumber}. Using default verse.`);
      return getDefaultVerse(dayNumber || 1);
    }
    
    const { data, error } = await supabase
      .from('daily_verses')
      .select('*')
      .eq('day_number', dayNumber)
      .single();
    
    if (error) {
      console.error(`Error fetching verse for day ${dayNumber}:`, error);
      // Si le verset n'existe pas pour ce jour spécifique, retournons un verset par défaut
      return getDefaultVerse(dayNumber);
    }
    
    console.log(`Successfully fetched verse for day ${dayNumber}:`, data);
    return data as DailyVerse;
  } catch (error) {
    console.error(`Error in getDailyVerse for day ${dayNumber}:`, error);
    return getDefaultVerse(dayNumber);
  }
};

/**
 * Fournit un verset par défaut lorsque aucun n'est disponible dans la base de données
 * @param {number} dayNumber Numéro du jour 
 * @returns {DailyVerse} Verset par défaut
 */
const getDefaultVerse = (dayNumber: number): DailyVerse => {
  const defaultVerses = [
    { reference: 'Psaumes 119:105', text: 'Ta parole est une lampe à mes pieds, et une lumière sur mon sentier.' },
    { reference: 'Jean 3:16', text: 'Car Dieu a tant aimé le monde qu\'il a donné son Fils unique, afin que quiconque croit en lui ne périsse point, mais qu\'il ait la vie éternelle.' },
    { reference: 'Philippiens 4:13', text: 'Je puis tout par celui qui me fortifie.' },
    { reference: 'Jérémie 29:11', text: 'Car je connais les projets que j\'ai formés sur vous, dit l\'Éternel, projets de paix et non de malheur, afin de vous donner un avenir et de l\'espérance.' },
    { reference: 'Esaïe 40:31', text: 'Mais ceux qui se confient en l\'Éternel renouvellent leur force. Ils prennent leur vol comme les aigles; Ils courent, et ne se lassent point, Ils marchent, et ne se fatiguent point.' }
  ];
  
  // Utiliser le numéro du jour pour sélectionner un verset de manière déterministe
  const index = (dayNumber - 1) % defaultVerses.length;
  const selectedVerse = defaultVerses[index];
  
  return {
    id: `default-${dayNumber}`,
    day_number: dayNumber,
    reference: selectedVerse.reference,
    text: selectedVerse.text
  };
};

/**
 * Calcule le pourcentage de progression pour un jour donné
 * @param {string} userId ID de l'utilisateur
 * @param {number} dayNumber Numéro du jour
 * @returns {Promise<number>} Pourcentage de progression
 */
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

/**
 * Calcule la progression globale du plan de lecture
 * @param {string} userId ID de l'utilisateur
 * @returns {Promise<{totalPassages: number, passagesRead: number, passagesRemaining: number, progressPercentage: number}>}
 */
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

/**
 * Calcule le numéro de jour actuel en fonction de la date de début
 * @param {Date} startDate Date de début du plan
 * @returns {number} Numéro du jour (1-365)
 */
export const calculateDayNumber = (startDate: Date) => {
  const today = new Date();
  const start = new Date(startDate);
  
  // Réinitialiser les heures pour ne considérer que les jours
  today.setHours(0, 0, 0, 0);
  start.setHours(0, 0, 0, 0);
  
  const diffTime = today.getTime() - start.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  // Le jour 1 commence le jour de la date de début
  return Math.max(1, diffDays + 1);
};
