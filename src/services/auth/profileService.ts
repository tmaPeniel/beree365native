
/**
 * Service de gestion des profils utilisateurs
 */

import { supabase } from "@/integrations/supabase/client";
import { Profile } from '@/types/supabase';
import { toast } from "sonner";

/**
 * Récupère le profil de l'utilisateur
 * @param {string} userId ID de l'utilisateur
 * @returns {Promise<Profile|null>} Le profil de l'utilisateur ou null
 */
export const getUserProfile = async (userId: string): Promise<Profile | null> => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (error) throw error;
    return data as Profile;
  } catch (error) {
    console.error("Erreur lors de la récupération du profil:", error);
    return null;
  }
};

/**
 * Met à jour le profil de l'utilisateur
 * @param {string} userId ID de l'utilisateur
 * @param {{full_name?: string, start_date?: string}} updates Mises à jour à appliquer
 * @returns {Promise<{success: boolean, data?: Profile, error?: string}>}
 */
export const updateUserProfile = async (
  userId: string, 
  updates: { full_name?: string, start_date?: string }
): Promise<{success: boolean, data?: Profile, error?: string}> => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();
    
    if (error) throw error;
    toast.success("Profil mis à jour avec succès");
    return { success: true, data: data as Profile };
  } catch (error: any) {
    toast.error(`Erreur de mise à jour: ${error.message}`);
    return { success: false, error: error.message };
  }
};

/**
 * Rafraîchit le profil de l'utilisateur
 * Attend que le profil soit créé par les triggers si nécessaire
 * @param {string} userId ID de l'utilisateur
 * @returns {Promise<Profile|null>} Le profil de l'utilisateur ou null
 */
export const refreshUserProfile = async (userId: string): Promise<Profile | null> => {
  try {
    // Attendre un peu pour laisser les triggers faire leur travail
    let attempts = 0;
    const maxAttempts = 5;
    
    while (attempts < maxAttempts) {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();
        
      if (error) {
        console.error("Erreur lors de la récupération du profil:", error);
        throw error;
      }
      
      if (profile) {
        console.log("Profil trouvé:", profile.id);
        return profile as Profile;
      }
      
      // Si pas de profil, attendre un peu avant de réessayer
      attempts++;
      if (attempts < maxAttempts) {
        console.log(`Tentative ${attempts}/${maxAttempts}: profil non trouvé, attente...`);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    console.warn("Profil non trouvé après", maxAttempts, "tentatives");
    return null;
  } catch (error) {
    console.error("Erreur lors du rafraîchissement du profil:", error);
    toast.error("Impossible de récupérer votre profil");
    return null;
  }
};
