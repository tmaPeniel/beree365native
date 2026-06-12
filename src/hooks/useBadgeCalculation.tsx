import { useOptimizedAuth } from './useOptimizedAuth';
import { calculateUserBadges, getUserBadges } from '@/services/badgeService';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const useBadgeCalculation = () => {
  const { user } = useOptimizedAuth();

  const triggerBadgeCalculation = async () => {
    if (!user?.id) return;

    try {
      const badgesBefore = await getUserBadges(user.id);
      const badgeIdsBefore = new Set(badgesBefore.map((b) => b.badge_id));

      await calculateUserBadges(user.id);

      const badgesAfter = await getUserBadges(user.id);
      const newBadges = badgesAfter.filter((badge) => !badgeIdsBefore.has(badge.badge_id));

      for (const newBadge of newBadges) {
        toast.success(`🎉 Nouveau badge débloqué: ${newBadge.badge.name}!`);
        // Best-effort push notification (silent on failure)
        supabase.functions
          .invoke('send-badge-notification', {
            body: { badgeId: newBadge.badge_id, badgeName: newBadge.badge.name },
          })
          .catch(() => {});
      }
    } catch (error) {
      console.error('Erreur lors du calcul des badges:', error);
    }
  };

  return { triggerBadgeCalculation };
};
