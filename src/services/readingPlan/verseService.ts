
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
 * Récupère tous les versets du jour 1 jusqu'au jour spécifié de manière optimisée
 * @param {number} maxDayNumber Jour maximum à récupérer
 * @returns {Promise<DailyVerse[]>}
 */
export const getAllVersesUpToDay = async (maxDayNumber: number): Promise<DailyVerse[]> => {
  try {
    console.log(`Fetching all verses from day 1 to ${maxDayNumber}...`);
    
    if (!maxDayNumber || maxDayNumber < 1 || maxDayNumber > 365) {
      console.warn(`Invalid max day number provided: ${maxDayNumber}`);
      return [];
    }
    
    // Récupérer tous les versets disponibles en une seule requête
    const { data, error } = await supabase
      .from('daily_verses')
      .select('*')
      .lte('day_number', maxDayNumber)
      .order('day_number', { ascending: false }); // Ordre décroissant comme dans l'original
    
    if (error) {
      console.error(`Error fetching verses up to day ${maxDayNumber}:`, error);
      // En cas d'erreur, générer des versets par défaut
      return generateDefaultVerses(maxDayNumber);
    }
    
    console.log(`Successfully fetched ${data?.length || 0} verses`);
    
    // Compléter avec des versets par défaut pour les jours manquants
    const verses = data as DailyVerse[];
    const versesMap = new Map(verses.map(v => [v.day_number, v]));
    const completeVerses: DailyVerse[] = [];
    
    // Créer une liste complète du jour maxDayNumber vers 1
    for (let day = maxDayNumber; day >= 1; day--) {
      const existingVerse = versesMap.get(day);
      if (existingVerse) {
        completeVerses.push(existingVerse);
      } else {
        completeVerses.push(getDefaultVerse(day));
      }
    }
    
    return completeVerses;
  } catch (error) {
    console.error(`Error in getAllVersesUpToDay for max day ${maxDayNumber}:`, error);
    return generateDefaultVerses(maxDayNumber);
  }
};

/**
 * Génère des versets par défaut pour tous les jours de 1 à maxDay
 * @param {number} maxDay Jour maximum
 * @returns {DailyVerse[]}
 */
const generateDefaultVerses = (maxDay: number): DailyVerse[] => {
  const verses: DailyVerse[] = [];
  for (let day = maxDay; day >= 1; day--) {
    verses.push(getDefaultVerse(day));
  }
  return verses;
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
