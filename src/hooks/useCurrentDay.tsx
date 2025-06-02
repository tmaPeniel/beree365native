
import { useMemo } from 'react';
import { useOptimizedAuth } from './useOptimizedAuth';
import { calculateCurrentDayNumber } from '@/utils/dateCalculations';

/**
 * Hook centralisé pour calculer le jour courant du plan de lecture
 * VERSION CORRIGÉE avec logs de débogage
 */
export const useCurrentDay = () => {
  const { profile } = useOptimizedAuth();
  
  // Calcul mémorisé du jour courant avec logs détaillés
  const currentDayNumber = useMemo(() => {
    console.log(`🔄 useCurrentDay - Recalcul en cours...`);
    console.log(`🔄 Profile start_date: ${profile?.start_date}`);
    console.log(`🔄 Profile id: ${profile?.id}`);
    
    if (!profile?.start_date) {
      console.log(`⚠️ Pas de start_date, retour jour 1`);
      return 1;
    }
    
    console.log(`📅 Calcul du jour courant depuis: ${profile.start_date}`);
    const dayNumber = calculateCurrentDayNumber(profile.start_date);
    
    // Limiter à 365 jours maximum
    const clampedDayNumber = Math.min(dayNumber, 365);
    console.log(`📅 Jour courant calculé: ${dayNumber}`);
    console.log(`📅 Jour courant limité: ${clampedDayNumber}`);
    
    return clampedDayNumber;
  }, [profile?.start_date, profile?.id]);

  console.log(`🎯 useCurrentDay - Jour final retourné: ${currentDayNumber}`);

  return { currentDayNumber };
};
