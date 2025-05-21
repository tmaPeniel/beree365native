
/**
 * Service de gestion des sessions utilisateurs
 */

import { supabase } from "@/integrations/supabase/client";

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
 * Fonction utilitaire pour nettoyer l'état d'authentification dans localStorage
 * Utile pour éviter les états "limbo" d'authentification
 */
export const cleanupAuthState = () => {
  // Supprimer tous les jetons d'authentification Supabase
  Object.keys(localStorage).forEach((key) => {
    if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
      localStorage.removeItem(key);
    }
  });
  // Faire de même pour sessionStorage si utilisé
  Object.keys(sessionStorage || {}).forEach((key) => {
    if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
      sessionStorage.removeItem(key);
    }
  });
};
