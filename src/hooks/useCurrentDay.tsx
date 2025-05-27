
import { useMemo } from 'react';
import { useOptimizedAuth } from './useOptimizedAuth';
import { calculateCurrentDayNumber } from '@/utils/dateCalculations';

/**
 * Hook centralisé pour calculer le jour courant du plan de lecture
 * Force la mise à jour quand le profil change
 */
export const useCurrentDay = () => {
  const { profile } = useOptimizedAuth();
  
  // Calcul mémorisé du jour courant en utilisant la fonction centralisée
  const currentDayNumber = useMemo(() => {
    if (!profile?.start_date) return 1;
    
    console.log(`📅 Calculating current day from start_date: ${profile.start_date}`);
    const dayNumber = calculateCurrentDayNumber(profile.start_date);
    
    // Limiter à 365 jours maximum
    const clampedDayNumber = Math.min(dayNumber, 365);
    console.log(`📅 Current day number: ${clampedDayNumber} (original: ${dayNumber})`);
    
    return clampedDayNumber;
  }, [profile?.start_date, profile?.id]);

  return { currentDayNumber };
};
