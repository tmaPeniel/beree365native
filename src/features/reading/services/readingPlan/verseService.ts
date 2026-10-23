
/**
 * Service gérant les versets du jour
 */

import { supabase } from "@/integrations/supabase/client";
import { requireCurrentUserId } from "@/features/auth/services/auth/sessionService";
import { DailyVerse } from "@/types/supabase";

/**
 * Récupère le verset du jour pour un jour donné
 * @param {number} dayNumber Numéro du jour
 * @returns {Promise<DailyVerse|null>}
 */
export const getDailyVerse = async (dayNumber: number) => {
  try {
    
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
  if (!maxDayNumber || maxDayNumber < 1 || maxDayNumber > 365) {
    console.warn(`Invalid max day number provided: ${maxDayNumber}`);
    return [];
  }

  const { data, error } = await supabase
    .from('daily_verses')
    .select('*')
    .lte('day_number', maxDayNumber)
    .order('day_number', { ascending: false });

  if (error) {
    throw new Error(`Impossible de charger l'historique des versets: ${error.message}`);
  }

  const verses = data satisfies DailyVerse[];
  const versesMap = new Map(verses.map(v => [v.day_number, v]));
  const completeVerses: DailyVerse[] = [];

  // Un contenu de remplacement est utilisé uniquement lorsqu'un jour est absent.
  for (let day = maxDayNumber; day >= 1; day--) {
    completeVerses.push(versesMap.get(day) ?? getDefaultVerse(day));
  }

  return completeVerses;
};

export const getLikedVerseDays = async (maxDayNumber: number): Promise<number[]> => {
  const userId = await requireCurrentUserId();
  const { data, error } = await supabase
    .from('verse_likes')
    .select('verse_day_number')
    .eq('user_id', userId)
    .lte('verse_day_number', maxDayNumber)
    .order('verse_day_number', { ascending: false });

  if (error) {
    throw new Error(`Impossible de charger vos versets aimés : ${error.message}`);
  }

  return data.map((item) => item.verse_day_number);
};

export const setVerseLike = async (dayNumber: number, liked: boolean) => {
  const userId = await requireCurrentUserId();

  if (liked) {
    const { error } = await supabase.from('verse_likes').insert({
      user_id: userId,
      verse_day_number: dayNumber,
    });

    if (error) throw error;
    return;
  }

  const { error } = await supabase
    .from('verse_likes')
    .delete()
    .eq('user_id', userId)
    .eq('verse_day_number', dayNumber);

  if (error) throw error;
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
