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
  updates: { avatar_url?: string | null; full_name?: string; start_date?: string }
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
