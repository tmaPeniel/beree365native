
/**
 * Service d'administration
 * Gère toutes les fonctionnalités d'administration
 */

import { supabase } from "@/integrations/supabase/client";
import { UserStats, AppRole } from "@/types/supabase";

/**
 * Vérifie si l'utilisateur actuel est administrateur
 */
export const isCurrentUserAdmin = async (): Promise<boolean> => {
  try {
    const { data, error } = await supabase.rpc('is_admin');
    if (error) throw error;
    return data || false;
  } catch (error) {
    console.error("Erreur lors de la vérification du rôle admin:", error);
    return false;
  }
};

/**
 * Récupère les statistiques de tous les utilisateurs (admin uniquement)
 * Le statut d'activité est maintenant calculé dynamiquement côté base de données
 */
export const getUserStats = async (): Promise<UserStats[]> => {
  try {
    const { data, error } = await supabase.rpc('get_user_stats');
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Erreur lors de la récupération des statistiques:", error);
    throw error;
  }
};

/**
 * Assigne un rôle à un utilisateur (admin uniquement)
 */
export const assignUserRole = async (userId: string, role: AppRole): Promise<void> => {
  try {
    const { error } = await supabase
      .from('user_roles')
      .upsert({ user_id: userId, role }, { onConflict: 'user_id,role' });
    
    if (error) throw error;
  } catch (error) {
    console.error("Erreur lors de l'assignation du rôle:", error);
    throw error;
  }
};

/**
 * Récupère les utilisateurs connectés dans les N derniers jours
 * Utilise maintenant la logique dynamique calculée par la base de données
 */
export const getRecentlyActiveUsers = async (days: number = 7): Promise<UserStats[]> => {
  try {
    const allUsers = await getUserStats();
    
    // Filtrer les utilisateurs actifs (le statut is_active est maintenant calculé dynamiquement)
    return allUsers.filter(user => user.is_active);
  } catch (error) {
    console.error("Erreur lors de la récupération des utilisateurs actifs:", error);
    throw error;
  }
};

/**
 * Récupère les utilisateurs inactifs depuis N jours
 * Utilise maintenant la logique dynamique calculée par la base de données
 */
export const getInactiveUsers = async (days: number = 7): Promise<UserStats[]> => {
  try {
    const allUsers = await getUserStats();
    
    // Filtrer les utilisateurs inactifs (le statut is_active est maintenant calculé dynamiquement)
    return allUsers.filter(user => !user.is_active);
  } catch (error) {
    console.error("Erreur lors de la récupération des utilisateurs inactifs:", error);
    throw error;
  }
};
