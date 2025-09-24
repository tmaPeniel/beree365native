import { useEffect } from 'react';
import { useOptimizedAuth } from './useOptimizedAuth';
import { calculateUserBadges, getUserBadges } from '@/services/badgeService';
import { notificationService } from '@/services/notificationService';
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
      // Récupérer les badges actuels avant le calcul
      const badgesBefore = await getUserBadges(user.id);
      const badgeIdsBefore = new Set(badgesBefore.map(b => b.badge_id));
      
      // Calculer les nouveaux badges
      await calculateUserBadges(user.id);
      
      // Récupérer les badges après le calcul
      const badgesAfter = await getUserBadges(user.id);
      const newBadges = badgesAfter.filter(badge => !badgeIdsBefore.has(badge.badge_id));
      
      // Envoyer des notifications pour les nouveaux badges
      for (const newBadge of newBadges) {
        await notificationService.sendBadgeEncouragement(user.id, newBadge.badge.name);
        toast.success(`🎉 Nouveau badge débloqué: ${newBadge.badge.name}!`);
      }
    } catch (error) {
      console.error('Erreur lors du calcul des badges:', error);
    }
  };

  return {
    triggerBadgeCalculation
  };
};