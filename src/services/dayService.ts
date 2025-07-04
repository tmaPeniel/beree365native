
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/**
 * Service pour gérer le jour courant depuis la base de données
 */

/**
 * Récupère le jour courant depuis la base de données
 */
export const getCurrentDayFromDB = async (userId: string): Promise<number> => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('current_day_number')
      .eq('id', userId)
      .single();
    
    if (error) throw error;
    
    return data?.current_day_number || 1;
  } catch (error) {
    console.error("Erreur lors de la récupération du jour courant:", error);
    return 1; // Valeur par défaut
  }
};

/**
 * Met à jour le jour courant dans la base de données
 */
export const updateCurrentDay = async (userId: string, newDay: number): Promise<boolean> => {
  try {
    // S'assurer que le jour est entre 1 et 365
    const clampedDay = Math.max(1, Math.min(newDay, 365));
    
    const { error } = await supabase
      .from('profiles')
      .update({ current_day_number: clampedDay })
      .eq('id', userId);
    
    if (error) throw error;
    
    //console.log(`Jour courant mis à jour: ${clampedDay}`);
    return true;
  } catch (error) {
    console.error("Erreur lors de la mise à jour du jour courant:", error);
    toast.error("Impossible de mettre à jour le jour courant");
    return false;
  }
};

/**
 * Passe au jour suivant
 */
export const goToNextDay = async (userId: string): Promise<number | null> => {
  try {
    const currentDay = await getCurrentDayFromDB(userId);
    const nextDay = Math.min(currentDay + 1, 365);
    
    const success = await updateCurrentDay(userId, nextDay);
    if (success) {
      toast.success(`Passage au jour ${nextDay}`);
      return nextDay;
    }
    
    return null;
  } catch (error) {
    console.error("Erreur lors du passage au jour suivant:", error);
    toast.error("Impossible de passer au jour suivant");
    return null;
  }
};

/**
 * Passe au jour précédent
 */
export const goToPreviousDay = async (userId: string): Promise<number | null> => {
  try {
    const currentDay = await getCurrentDayFromDB(userId);
    const previousDay = Math.max(currentDay - 1, 1);
    
    const success = await updateCurrentDay(userId, previousDay);
    if (success) {
      toast.success(`Passage au jour ${previousDay}`);
      return previousDay;
    }
    
    return null;
  } catch (error) {
    console.error("Erreur lors du passage au jour précédent:", error);
    toast.error("Impossible de passer au jour précédent");
    return null;
  }
};
