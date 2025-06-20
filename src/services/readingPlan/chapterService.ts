
/**
 * Service gérant les chapitres du plan de lecture
 */

import { supabase } from "@/integrations/supabase/client";
import { ReadingPlanChapter } from "@/types/supabase";

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
      .eq('day_number', dayNumber);
    
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
