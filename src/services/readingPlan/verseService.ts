
/**
 * Service gérant les versets du jour
 */

import { supabase } from "@/integrations/supabase/client";
import { DailyVerse } from "@/types/supabase";

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
export const getDefaultVerse = (dayNumber: number): DailyVerse => {
  const defaultWisdoms = [
    'La sagesse commence par la crainte de l\'Éternel',
    'Un cœur joyeux est un bon remède',
    'La patience vaut mieux que l\'orgueil',
    'Celui qui marche avec les sages devient sage',
    'La confiance en l\'Éternel est source de force'
  ];
  
  // Utiliser le numéro du jour pour sélectionner une sagesse de manière déterministe
  const index = (dayNumber - 1) % defaultWisdoms.length;
  const selectedWisdom = defaultWisdoms[index];
  
  return {
    id: `default-${dayNumber}`,
    day_number: dayNumber,
    reference: 'Proverbes',
    text: '', // On n'utilise plus ce champ
    wisdomType: selectedWisdom
  };
};
