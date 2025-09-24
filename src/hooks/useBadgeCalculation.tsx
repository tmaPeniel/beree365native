import { useEffect } from 'react';
import { useOptimizedAuth } from './useOptimizedAuth';
import { calculateUserBadges } from '@/services/badgeService';
import { toast } from 'sonner';

/**
 * Hook pour gérer automatiquement le calcul des badges
 * Se déclenche lors de changements dans la progression
 */
export const useBadgeCalculation = () => {
  const { user } = useOptimizedAuth();

  const triggerBadgeCalculation = async () => {
    if (!user?.id) return;

    try {
      await calculateUserBadges(user.id);
    } catch (error) {
      console.error('Erreur lors du calcul des badges:', error);
    }
  };

  return {
    triggerBadgeCalculation
  };
};