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
          // Désactiver temporairement RLS via la fonction SQL
          await supabase.rpc('disable_rls');
          
          // Créer le profil manuellement
          const { error: profileError } = await supabase
            .from('profiles')
            .insert([{
              id: authData.user.id,
              full_name: fullName,
              start_date: startDate.toISOString().split('T')[0]
            }]);
          
          // Réactiver RLS
          await supabase.rpc('enable_rls');
          
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
          await supabase.rpc('disable_rls');
          
          await supabase
            .from('profiles')
            .insert([{
              id: data.user.id,
              full_name: 'Utilisateur',
              start_date: new Date().toISOString().split('T')[0]
            }]);
            
          await supabase.rpc('enable_rls');
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

/**
 * Rafraîchit le profil de l'utilisateur
 * Si le profil n'existe pas, en crée un par défaut
 * @param {string} userId ID de l'utilisateur
 * @returns {Promise<any|null>} Le profil de l'utilisateur ou null
 */
export const refreshUserProfile = async (userId: string) => {
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
        await supabase.rpc('disable_rls');
        
        const { data: newProfile, error: insertError } = await supabase
          .from('profiles')
          .insert([{
            id: userId,
            full_name: 'Utilisateur',
            start_date: new Date().toISOString().split('T')[0]
          }])
          .select()
          .single();
          
        await supabase.rpc('enable_rls');
        
        if (insertError) {
          console.error("Erreur lors de la création du profil:", insertError);
          throw insertError;
        }
        
        return newProfile;
      } catch (error) {
        console.error("Erreur lors de la gestion RLS:", error);
        throw error;
      }
    }
    
    return profile;
  } catch (error) {
    console.error("Erreur lors du rafraîchissement du profil:", error);
    toast.error("Impossible de récupérer votre profil");
    return null;
  }
};
