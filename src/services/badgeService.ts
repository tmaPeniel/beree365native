import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  criteria: any; // JSONB peut être n'importe quel type JSON
  created_at: string;
}

export interface UserBadge {
  id: string;
  user_id: string;
  badge_id: string;
  unlocked_at: string;
  created_at: string;
  badge: Badge;
}

/**
 * Récupérer tous les badges disponibles
 */
export const getAllBadges = async (): Promise<Badge[]> => {
  try {
    const { data, error } = await supabase
      .from('badges')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Erreur lors de la récupération des badges:', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('Erreur getAllBadges:', error);
    return [];
  }
};

/**
 * Récupérer les badges débloqués par un utilisateur
 */
export const getUserBadges = async (userId: string): Promise<UserBadge[]> => {
  try {
    const { data, error } = await supabase
      .from('user_badges')
      .select(`
        *,
        badge:badges(*)
      `)
      .eq('user_id', userId)
      .order('unlocked_at', { ascending: false });

    if (error) {
      console.error('Erreur lors de la récupération des badges utilisateur:', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('Erreur getUserBadges:', error);
    return [];
  }
};

/**
 * Calculer et débloquer automatiquement les badges pour un utilisateur
 */
export const calculateUserBadges = async (userId: string): Promise<boolean> => {
  try {
    const { error } = await supabase.rpc('calculate_user_badges', {
      _user_id: userId
    });

    if (error) {
      console.error('Erreur lors du calcul des badges:', error);
      throw error;
    }

    return true;
  } catch (error) {
    console.error('Erreur calculateUserBadges:', error);
    return false;
  }
};

/**
 * Débloquer manuellement un badge pour un utilisateur
 */
export const unlockBadge = async (userId: string, badgeId: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('user_badges')
      .insert({
        user_id: userId,
        badge_id: badgeId
      });

    if (error) {
      console.error('Erreur lors du déverrouillage du badge:', error);
      throw error;
    }

    toast.success('Nouveau badge débloqué ! 🎉');
    return true;
  } catch (error) {
    console.error('Erreur unlockBadge:', error);
    return false;
  }
};

/**
 * Récupérer les statistiques de badges pour un utilisateur
 */
export const getBadgeStats = async (userId: string) => {
  try {
    const [allBadges, userBadges] = await Promise.all([
      getAllBadges(),
      getUserBadges(userId)
    ]);

    return {
      totalBadges: allBadges.length,
      unlockedBadges: userBadges.length,
      progressPercentage: allBadges.length > 0 ? Math.round((userBadges.length / allBadges.length) * 100) : 0,
      latestBadges: userBadges.slice(0, 3) // 3 derniers badges débloqués
    };
  } catch (error) {
    console.error('Erreur getBadgeStats:', error);
    return {
      totalBadges: 0,
      unlockedBadges: 0,
      progressPercentage: 0,
      latestBadges: []
    };
  }
};