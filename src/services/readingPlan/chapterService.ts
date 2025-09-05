
/**
 * Service gérant les chapitres du plan de lecture
 */

import { supabase } from "@/integrations/supabase/client";
import { ReadingPlanChapter } from "@/types/supabase";

/**
 * Récupère les chapitres du plan de lecture pour un jour donné
 * Filtre automatiquement par le plan sélectionné de l'utilisateur
 * @param {number} dayNumber Numéro du jour (1-365)
 * @param {string} userId ID de l'utilisateur pour filtrer par son plan
 * @returns {Promise<ReadingPlanChapter[]>} Liste des chapitres pour ce jour
 */
export const getReadingPlanForDay = async (dayNumber: number, userId: string): Promise<ReadingPlanChapter[]> => {
  try {
    console.log(`Fetching reading plan for day ${dayNumber} and user ${userId}...`);
    
    // D'abord récupérer le plan sélectionné de l'utilisateur
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('selected_plan_id')
      .eq('id', userId)
      .single();

    if (profileError) throw profileError;

    // Ensuite récupérer les chapitres pour ce jour et ce plan
    const { data, error } = await supabase
      .from('reading_plan_chapters')
      .select('*')
      .eq('day_number', dayNumber)
      .eq('plan_id', profile.selected_plan_id)
      .order('id');
    
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
