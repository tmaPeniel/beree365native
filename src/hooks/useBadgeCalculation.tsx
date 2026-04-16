import { useOptimizedAuth } from './useOptimizedAuth';
import { calculateUserBadges, getUserBadges } from '@/services/badgeService';
import { pushService } from '@/services/pushService';
import { toast } from 'sonner';

/**
 * Hook pour gérer automatiquement le calcul des badges
 */
export const useBadgeCalculation = () => {
  const { user } = useOptimizedAuth();

  const triggerBadgeCalculation = async () => {
    if (!user?.id) return;

    try {
      const badgesBefore = await getUserBadges(user.id);
      const badgeIdsBefore = new Set(badgesBefore.map(b => b.badge_id));
      
      await calculateUserBadges(user.id);
      
      const badgesAfter = await getUserBadges(user.id);
      const newBadges = badgesAfter.filter(badge => !badgeIdsBefore.has(badge.badge_id));

      for (const newBadge of newBadges) {
        await pushService.sendNotification({
          title: '🎉 Nouveau badge débloqué!',
          message: `Félicitations! Vous avez débloqué: ${newBadge.badge.name}`,
          userId: user.id,
        });
        toast.success(`🎉 Nouveau badge débloqué: ${newBadge.badge.name}!`);
      }
    } catch (error) {
      console.error('Erreur lors du calcul des badges:', error);
    }
  };

  return { triggerBadgeCalculation };
};
