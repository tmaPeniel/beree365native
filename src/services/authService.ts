
/**
 * Service d'authentification
 * Gère toutes les interactions avec l'authentification Supabase
 */

import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/**
 * Inscription d'un nouvel utilisateur
 * @param {string} email Email de l'utilisateur
 * @param {string} password Mot de passe de l'utilisateur
 * @param {string} fullName Nom complet de l'utilisateur
 * @param {Date} startDate Date de début du plan de lecture
 * @returns {Promise<{success: boolean, user?: any, error?: string}>}
 */
export const signUp = async (email: string, password: string, fullName: string, startDate: Date) => {
  try {
    // Créer le compte utilisateur
    const { data: authData, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (signUpError) throw signUpError;
    
    if (authData.user) {
      // Créer un profil pour l'utilisateur
      const { error: profileError } = await supabase
        .from('profiles')
        .insert([{
          id: authData.user.id,
          full_name: fullName,
          start_date: startDate.toISOString().split('T')[0]
        }]);
      
      if (profileError) throw profileError;
      
      return { success: true, user: authData.user };
    }
    
    return { success: false, error: "Inscription réussie, mais l'utilisateur n'a pas été créé" };
  } catch (error: any) {
    toast.error(`Erreur d'inscription: ${error.message}`);
    return { success: false, error: error.message };
  }
};

/**
 * Connexion d'un utilisateur existant
 * @param {string} email Email de l'utilisateur
 * @param {string} password Mot de passe de l'utilisateur
 * @returns {Promise<{success: boolean, user?: any, error?: string}>}
 */
export const signIn = async (email: string, password: string) => {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;
    
    return { success: true, user: data.user };
  } catch (error: any) {
    toast.error(`Erreur de connexion: ${error.message}`);
    return { success: false, error: error.message };
  }
};

/**
 * Déconnexion de l'utilisateur
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export const signOut = async () => {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    return { success: true };
  } catch (error: any) {
    toast.error(`Erreur de déconnexion: ${error.message}`);
    return { success: false, error: error.message };
  }
};

/**
 * Récupère l'utilisateur actuellement connecté
 * @returns {Promise<any|null>} L'utilisateur ou null s'il n'est pas connecté
 */
export const getCurrentUser = async () => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  } catch (error) {
    console.error("Erreur lors de la récupération de l'utilisateur:", error);
    return null;
  }
};

/**
 * Récupère le profil de l'utilisateur
 * @param {string} userId ID de l'utilisateur
 * @returns {Promise<any|null>} Le profil de l'utilisateur ou null
 */
export const getUserProfile = async (userId: string) => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Erreur lors de la récupération du profil:", error);
    return null;
  }
};

/**
 * Met à jour le profil de l'utilisateur
 * @param {string} userId ID de l'utilisateur
 * @param {{full_name?: string, start_date?: string}} updates Mises à jour à appliquer
 * @returns {Promise<{success: boolean, data?: any, error?: string}>}
 */
export const updateUserProfile = async (userId: string, updates: { full_name?: string, start_date?: string }) => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId);
    
    if (error) throw error;
    toast.success("Profil mis à jour avec succès");
    return { success: true, data };
  } catch (error: any) {
    toast.error(`Erreur de mise à jour: ${error.message}`);
    return { success: false, error: error.message };
  }
};
