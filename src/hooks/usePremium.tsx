import { useMemo } from 'react';
import { useAuth } from './useAuth';

/**
 * Hook central du système Freemium.
 * Source de vérité unique pour le gating UI Premium.
 */
export const usePremium = () => {
  const { profile, isLoading } = useAuth();

  return useMemo(() => {
    const p = profile as any;
    const isPremiumFlag = !!p?.is_premium;
    const endDate = p?.premium_end_date ? new Date(p.premium_end_date) : null;
    const startDate = p?.premium_start_date ? new Date(p.premium_start_date) : null;

    const isPremium =
      isPremiumFlag && (endDate === null || endDate.getTime() > Date.now());

    const daysRemaining = endDate
      ? Math.max(0, Math.ceil((endDate.getTime() - Date.now()) / 86400000))
      : null;

    return {
      isPremium,
      isExpired: isPremiumFlag && endDate !== null && endDate.getTime() <= Date.now(),
      premiumStartDate: startDate,
      premiumEndDate: endDate,
      premiumSource: (p?.premium_source as string | null) ?? null,
      daysRemaining,
      isLoading,
    };
  }, [profile, isLoading]);
};
