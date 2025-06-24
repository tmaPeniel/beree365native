/**
 * Service d'authentification de base
 * Fournit les fonctions fondamentales d'authentification
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
    console.log("Démarrage de l'inscription avec:", { email, fullName, startDate });
    
    // Créer le compte utilisateur avec les métadonnées
    const { data: authData, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          start_date: startDate.toISOString().split('T')[0]
        }
      }
    });

    if (signUpError) {
      console.error("Erreur lors de l'inscription:", signUpError);
      return { success: false, error: signUpError.message };
    }
    
    if (!authData.user) {
      console.error("Aucun utilisateur créé lors de l'inscription");
      return { success: false, error: "Aucun utilisateur créé lors de l'inscription" };
    }

    console.log("Utilisateur créé avec succès:", authData.user.id);
    
    // Attendre un moment pour que les triggers se déclenchent
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Vérifier si le profil a été créé par le trigger
    const { data: existingProfile, error: profileCheckError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', authData.user.id)
      .maybeSingle();
    
    if (profileCheckError) {
      console.error("Erreur lors de la vérification du profil:", profileCheckError);
    }
    
    // Si le profil n'existe pas, le créer manuellement
    if (!existingProfile) {
      console.log("Création manuelle du profil...");
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: authData.user.id,
          full_name: fullName,
          start_date: startDate.toISOString().split('T')[0]
        });
      
      if (profileError) {
        console.error("Erreur lors de la création manuelle du profil:", profileError);
        // Ne pas bloquer l'inscription pour une erreur de profil
        toast.warning("Votre compte a été créé mais votre profil n'a pas pu être initialisé complètement");
      } else {
        console.log("Profil créé manuellement avec succès");
      }
    } else {
      console.log("Profil trouvé, créé automatiquement par le trigger");
    }
    
    return { success: true, user: authData.user };
  } catch (error: any) {
    console.error("Erreur complète lors de l'inscription:", error);
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
    
    if (data.user) {
      // Vérifier si l'utilisateur a un profil
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .maybeSingle();
        
      if (profileError) {
        console.error("Erreur lors de la vérification du profil:", profileError);
      }
      
      // Si aucun profil n'existe, en créer un
      if (!profileData) {
        console.log("Profil non trouvé lors de la connexion, création d'un profil par défaut");
        
        await supabase
          .from('profiles')
          .insert([{
            id: data.user.id,
            full_name: 'Utilisateur',
            start_date: new Date().toISOString().split('T')[0]
          }]);
      }
    }
    
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
 * Envoie un email de réinitialisation de mot de passe
 * @param {string} email Email de l'utilisateur
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export const resetPassword = async (email: string) => {
  try {
    console.log("Envoi de l'email de réinitialisation pour:", email);
    
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
      console.error("Erreur Supabase lors de l'envoi de l'email:", error);
      throw error;
    }
    
    console.log("Email de réinitialisation envoyé avec succès");
    toast.success("Un email de réinitialisation a été envoyé à votre adresse");
    return { success: true };
  } catch (error: any) {
    console.error("Erreur lors de l'envoi de l'email:", error);
    toast.error(`Erreur lors de l'envoi de l'email: ${error.message}`);
    return { success: false, error: error.message };
  }
};

/**
 * Met à jour le mot de passe de l'utilisateur
 * @param {string} newPassword Nouveau mot de passe
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export const updatePassword = async (newPassword: string) => {
  try {
    const { error } = await supabase.auth.updateUser({
      password: newPassword
    });

    if (error) throw error;
    
    toast.success("Votre mot de passe a été mis à jour avec succès");
    return { success: true };
  } catch (error: any) {
    toast.error(`Erreur lors de la mise à jour du mot de passe: ${error.message}`);
    return { success: false, error: error.message };
  }
};
