
import { useMemo } from 'react';
import { useOptimizedAuth } from './useOptimizedAuth';

/**
 * Hook centralisé pour calculer le jour courant du plan de lecture
 */
export const useCurrentDay = () => {
  const { profile } = useOptimizedAuth();
  
  // Calcul mémorisé du jour courant
  const currentDayNumber = useMemo(() => {
    if (!profile?.start_date) return 1;
    
    const startDate = new Date(profile.start_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    startDate.setHours(0, 0, 0, 0);
    
    const diffTime = today.getTime() - startDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    return Math.max(1, diffDays + 1);
  }, [profile?.start_date]);

  return { currentDayNumber };
};
