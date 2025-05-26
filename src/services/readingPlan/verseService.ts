
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
