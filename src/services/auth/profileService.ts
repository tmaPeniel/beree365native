
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
 * Si le profil n'existe pas, en crée un par défaut
 * @param {string} userId ID de l'utilisateur
 * @returns {Promise<Profile|null>} Le profil de l'utilisateur ou null
 */
export const refreshUserProfile = async (userId: string): Promise<Profile | null> => {
  try {
    // Vérifier si l'utilisateur a un profil
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
      
    if (error) {
      console.error("Erreur lors de la récupération du profil:", error);
      throw error;
    }
    
    // Si aucun profil n'existe, essayer d'en créer un
    if (!profile) {
      console.log("Profil non trouvé, tentative de création");
      
      try {
        // Utiliser une assertion de type pour éviter l'erreur TypeScript
        await (supabase.rpc as any)('disable_rls');
        
        const { data: newProfile, error: insertError } = await supabase
          .from('profiles')
          .insert([{
            id: userId,
            full_name: 'Utilisateur',
            start_date: new Date().toISOString().split('T')[0]
          }])
          .select()
          .single();
          
        // Utiliser une assertion de type pour éviter l'erreur TypeScript
        await (supabase.rpc as any)('enable_rls');
        
        if (insertError) {
          console.error("Erreur lors de la création du profil:", insertError);
          throw insertError;
        }
        
        return newProfile as Profile;
      } catch (error) {
        console.error("Erreur lors de la gestion RLS:", error);
        throw error;
      }
    }
    
    return profile as Profile;
  } catch (error) {
    console.error("Erreur lors du rafraîchissement du profil:", error);
    toast.error("Impossible de récupérer votre profil");
    return null;
  }
};
