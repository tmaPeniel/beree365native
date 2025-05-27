
import { useMemo } from 'react';
import { useOptimizedAuth } from './useOptimizedAuth';
import { calculateCurrentDayNumber } from '@/utils/dateCalculations';

/**
 * Hook centralisé pour calculer le jour courant du plan de lecture
 */
export const useCurrentDay = () => {
  const { profile } = useOptimizedAuth();
  
  // Calcul mémorisé du jour courant en utilisant la fonction centralisée
  const currentDayNumber = useMemo(() => {
    if (!profile?.start_date) return 1;
    
    console.log(`📅 Calculating current day from start_date: ${profile.start_date}`);
    const dayNumber = calculateCurrentDayNumber(profile.start_date);
    console.log(`📅 Current day number: ${dayNumber}`);
    
    return dayNumber;
  }, [profile?.start_date]);

  return { currentDayNumber };
};
