
import { useState, useEffect, useCallback } from 'react';
import { useOptimizedAuth } from './useOptimizedAuth';
import { getCurrentDayFromDB, updateCurrentDay, goToNextDay, goToPreviousDay } from '@/services/dayService';

/**
 * Hook pour gérer le jour courant depuis la base de données
 * Remplace le calcul de date par une valeur stockée en DB
 */
export const useCurrentDayFromDB = () => {
  const { user, profile } = useOptimizedAuth();
  const [currentDayNumber, setCurrentDayNumber] = useState<number>(1);
  const [isLoading, setIsLoading] = useState(true);

  // Récupérer le jour courant depuis la DB
  const refreshCurrentDay = useCallback(async () => {
    if (!user?.id) {
      setCurrentDayNumber(1);
      setIsLoading(false);
      return;
    }

    try {
      console.log(`🔄 Récupération du jour courant depuis la DB pour ${user.id}`);
      const dayFromDB = await getCurrentDayFromDB(user.id);
      console.log(`📅 Jour récupéré depuis la DB: ${dayFromDB}`);
      setCurrentDayNumber(dayFromDB);
    } catch (error) {
      console.error("Erreur lors de la récupération du jour courant:", error);
      setCurrentDayNumber(1);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  // Charger le jour courant au montage
  useEffect(() => {
    refreshCurrentDay();
  }, [refreshCurrentDay]);

  // Fonctions pour naviguer entre les jours
  const goToNext = useCallback(async () => {
    if (!user?.id) return false;
    
    const newDay = await goToNextDay(user.id);
    if (newDay !== null) {
      setCurrentDayNumber(newDay);
      return true;
    }
    return false;
  }, [user?.id]);

  const goToPrevious = useCallback(async () => {
    if (!user?.id) return false;
    
    const newDay = await goToPreviousDay(user.id);
    if (newDay !== null) {
      setCurrentDayNumber(newDay);
      return true;
    }
    return false;
  }, [user?.id]);

  const goToSpecificDay = useCallback(async (dayNumber: number) => {
    if (!user?.id) return false;
    
    const success = await updateCurrentDay(user.id, dayNumber);
    if (success) {
      setCurrentDayNumber(dayNumber);
      return true;
    }
    return false;
  }, [user?.id]);

  console.log(`🎯 useCurrentDayFromDB - Jour final: ${currentDayNumber}`);

  return {
    currentDayNumber,
    isLoading,
    refreshCurrentDay,
    goToNext,
    goToPrevious,
    goToSpecificDay
  };
};
