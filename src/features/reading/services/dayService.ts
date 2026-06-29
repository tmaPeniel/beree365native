import { supabase } from "@/integrations/supabase/client";

export const getCurrentDayFromDB = async (userId: string): Promise<number> => {
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("current_day_number")
      .eq("id", userId)
      .single();

    if (error) throw error;
    return data?.current_day_number || 1;
  } catch (error) {
    console.error("Erreur lors de la récupération du jour courant:", error);
    return 1;
  }
};

export const updateCurrentDay = async (
  userId: string,
  newDay: number,
  planDuration: number = 365
): Promise<boolean> => {
  try {
    const clampedDay = Math.max(1, Math.min(newDay, planDuration));
    const { error } = await supabase
      .from("profiles")
      .update({ current_day_number: clampedDay })
      .eq("id", userId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error("Erreur lors de la mise à jour du jour courant:", error);
    return false;
  }
};

export const goToNextDay = async (userId: string, planDuration: number = 365): Promise<number | null> => {
  const currentDay = await getCurrentDayFromDB(userId);
  const nextDay = Math.min(currentDay + 1, planDuration);
  return (await updateCurrentDay(userId, nextDay, planDuration)) ? nextDay : null;
};

export const goToPreviousDay = async (userId: string, planDuration: number = 365): Promise<number | null> => {
  const currentDay = await getCurrentDayFromDB(userId);
  const previousDay = Math.max(currentDay - 1, 1);
  return (await updateCurrentDay(userId, previousDay, planDuration)) ? previousDay : null;
};
