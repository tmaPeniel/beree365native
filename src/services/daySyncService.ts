
import { supabase } from "@/integrations/supabase/client";
import { calculateCurrentDayNumber } from "@/utils/dateCalculations";
import { toast } from "sonner";

/**
 * Service pour synchroniser le jour courant entre la DB et le calcul de date
 */

/**
 * Synchronise le jour courant de la DB avec le calcul de date
 */
export const syncCurrentDayWithDate = async (userId: string, startDate: string): Promise<number | null> => {
  try {
    console.log(`🔄 Synchronisation du jour pour l'utilisateur ${userId} avec date de début ${startDate}`);
    
    // Calculer le jour actuel selon la date
    const calculatedDay = calculateCurrentDayNumber(startDate);
    console.log(`📊 Jour calculé selon la date: ${calculatedDay}`);
    
    // Récupérer le jour actuel depuis la DB
    const { data: profile, error: fetchError } = await supabase
      .from('profiles')
      .select('current_day_number')
      .eq('id', userId)
      .single();
    
    if (fetchError) {
      console.error("Erreur lors de la récupération du profil:", fetchError);
      return null;
    }
    
    const dbDay = profile?.current_day_number || 1;
    console.log(`📊 Jour dans la DB: ${dbDay}`);
    
    // Si les jours sont différents, mettre à jour la DB
    if (dbDay !== calculatedDay) {
      console.log(`🔄 Mise à jour nécessaire: DB(${dbDay}) → Calculé(${calculatedDay})`);
      
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ current_day_number: calculatedDay })
        .eq('id', userId);
      
      if (updateError) {
        console.error("Erreur lors de la mise à jour du jour:", updateError);
        return null;
      }
      
      console.log(`✅ Jour synchronisé: ${calculatedDay}`);
      return calculatedDay;
    } else {
      console.log(`✅ Jour déjà synchronisé: ${calculatedDay}`);
      return calculatedDay;
    }
  } catch (error) {
    console.error("Erreur lors de la synchronisation du jour:", error);
    return null;
  }
};

/**
 * Vérifie et synchronise le jour au démarrage de l'application
 */
export const checkAndSyncDayOnStartup = async (userId: string, startDate: string): Promise<void> => {
  try {
    const syncedDay = await syncCurrentDayWithDate(userId, startDate);
    if (syncedDay !== null) {
      console.log(`🚀 Jour synchronisé au démarrage: ${syncedDay}`);
    } else {
      console.warn("⚠️ Échec de la synchronisation au démarrage");
    }
  } catch (error) {
    console.error("Erreur lors de la synchronisation au démarrage:", error);
  }
};
