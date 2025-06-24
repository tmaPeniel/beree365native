
/**
 * Service d'administration
 * Gère toutes les fonctionnalités d'administration avec sécurité renforcée
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
 * Utilise la version sécurisée avec audit logging
 */
export const getUserStats = async (): Promise<UserStats[]> => {
  try {
    const { data, error } = await supabase.rpc('get_user_stats_secure');
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
    
    // Logger l'action admin
    await supabase.rpc('log_admin_action', {
      action_type: 'ASSIGN_ROLE',
      target_table: 'user_roles',
      target_id: userId,
      details: { role }
    });
  } catch (error) {
    console.error("Erreur lors de l'assignation du rôle:", error);
    throw error;
  }
};

/**
 * Récupère les utilisateurs connectés dans les N derniers jours
 */
export const getRecentlyActiveUsers = async (days: number = 7): Promise<UserStats[]> => {
  try {
    const allUsers = await getUserStats();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    return allUsers.filter(user => {
      if (!user.last_login_at) return false;
      return new Date(user.last_login_at) >= cutoffDate;
    });
  } catch (error) {
    console.error("Erreur lors de la récupération des utilisateurs actifs:", error);
    throw error;
  }
};

/**
 * Assigne des rôles aux utilisateurs existants qui n'en ont pas (admin uniquement)
 */
export const assignMissingUserRoles = async (): Promise<number> => {
  try {
    const { data, error } = await supabase.rpc('assign_missing_user_roles');
    if (error) throw error;
    return data || 0;
  } catch (error) {
    console.error("Erreur lors de l'assignation des rôles manquants:", error);
    throw error;
  }
};

/**
 * Obtient le nombre d'utilisateurs sans rôle (pour vérification)
 */
export const getUsersWithoutRoles = async (): Promise<number> => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select(`
        id,
        user_roles!left(user_id)
      `)
      .is('user_roles.user_id', null);
    
    if (error) throw error;
    return data?.length || 0;
  } catch (error) {
    console.error("Erreur lors du comptage des utilisateurs sans rôle:", error);
    throw error;
  }
};
