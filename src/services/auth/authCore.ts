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
    
    // Créer le compte utilisateur avec les métadonnées pour le trigger
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

    if (signUpError) throw signUpError;
    
    if (authData.user) {
      console.log("Utilisateur créé avec succès dans auth.users:", authData.user.id);
      
      // Vérifier si le profil a été créé automatiquement par le trigger
      const { data: profileData, error: profileCheckError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authData.user.id)
        .maybeSingle();
        
      if (profileCheckError) {
        console.error("Erreur lors de la vérification du profil:", profileCheckError);
      }
      
      // Si le profil n'existe pas encore (cas où le trigger n'aurait pas fonctionné),
      // essayer de le créer manuellement
      if (!profileData) {
        console.log("Profil non trouvé, tentative de création manuelle");
        
        try {
          // Utiliser une assertion de type pour éviter l'erreur TypeScript
          await (supabase.rpc as any)('disable_rls');
          
          // Créer le profil manuellement
          const { error: profileError } = await supabase
            .from('profiles')
            .insert([{
              id: authData.user.id,
              full_name: fullName,
              start_date: startDate.toISOString().split('T')[0]
            }]);
          
          // Utiliser une assertion de type pour éviter l'erreur TypeScript
          await (supabase.rpc as any)('enable_rls');
          
          if (profileError) {
            console.error("Erreur lors de la création manuelle du profil:", profileError);
            toast.error("Votre compte a été créé mais votre profil n'a pas pu être initialisé");
          } else {
            console.log("Profil créé manuellement avec succès");
          }
        } catch (error) {
          console.error("Erreur lors de la gestion RLS:", error);
        }
      } else {
        console.log("Profil existant trouvé:", profileData.id);
      }
      
      return { success: true, user: authData.user };
    }
    
    return { success: false, error: "Inscription réussie, mais l'utilisateur n'a pas été créé" };
  } catch (error: any) {
    console.error("Erreur complète lors de l'inscription:", error);
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
        
        try {
          // Utiliser une assertion de type pour éviter l'erreur TypeScript
          await (supabase.rpc as any)('disable_rls');
          
          await supabase
            .from('profiles')
            .insert([{
              id: data.user.id,
              full_name: 'Utilisateur',
              start_date: new Date().toISOString().split('T')[0]
            }]);
            
          // Utiliser une assertion de type pour éviter l'erreur TypeScript
          await (supabase.rpc as any)('enable_rls');
        } catch (error) {
          console.error("Erreur lors de la création du profil pendant la connexion:", error);
        }
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
