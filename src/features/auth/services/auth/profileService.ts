import { supabase } from "@/integrations/supabase/client";
import { Profile } from "@/types/supabase";

export const getUserProfile = async (userId: string): Promise<Profile | null> => {
  try {
    const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).single();
    if (error) throw error;
    return data as Profile;
  } catch (error) {
    console.error("Erreur lors de la récupération du profil:", error);
    return null;
  }
};

export const updateUserProfile = async (
  userId: string,
  updates: { avatar_url?: string | null; full_name?: string }
): Promise<{ success: boolean; data?: Profile; error?: string }> => {
  try {
    const { data, error } = await supabase
      .from("profiles")
      .update(updates)
      .eq("id", userId)
      .select()
      .single();

    if (error) throw error;
    return { success: true, data: data as Profile };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

export const updatePlanStartDate = async (
  startDate: string
): Promise<{
  success: boolean;
  data?: { current_day_number: number; start_date: string };
  error?: string;
}> => {
  try {
    const { data, error } = await supabase.rpc("update_my_plan_start_date", {
      new_start_date: startDate,
    });

    if (error) throw error;

    const updatedProfileDates = data?.[0];
    if (!updatedProfileDates) {
      return { success: false, error: "La date de début n'a pas pu être mise à jour." };
    }

    return { success: true, data: updatedProfileDates };
  } catch (error: any) {
    return {
      success: false,
      error: error.message?.includes("Active reading plan not found")
        ? "Aucun plan de lecture actif n'est associé à votre profil."
        : "La date de début n'a pas pu être mise à jour.",
    };
  }
};

export const refreshUserProfile = async (userId: string): Promise<Profile | null> => {
  try {
    let attempts = 0;
    const maxAttempts = 5;

    while (attempts < maxAttempts) {
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle();

      if (error) throw error;
      if (profile) return profile as Profile;

      attempts++;
      if (attempts < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    return null;
  } catch (error) {
    console.error("Erreur lors du rafraîchissement du profil:", error);
    return null;
  }
};
