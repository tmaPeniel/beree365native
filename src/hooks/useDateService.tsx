
import { useState, useEffect, useCallback } from 'react';
import { useOptimizedAuth } from './useOptimizedAuth';
import { usePlanDuration } from './usePlanDuration';
import { getCurrentDayNumber, getDateForDay, isToday, getPlanStats } from '@/services/dateService';
import { updateCurrentDay } from '@/services/dayService';

/**
 * Hook simple pour gérer les dates du plan de lecture
 * SYSTÈME SIMPLIFIÉ - Tout basé sur le calcul de date
 */
export const useDateService = () => {
  const { profile, user } = useOptimizedAuth();
  const { planDuration } = usePlanDuration();
  const [currentDayNumber, setCurrentDayNumber] = useState<number>(1);
  const [isLoading, setIsLoading] = useState(true);

  // Calculer le jour courant basé sur la date de début
  const refreshCurrentDay = useCallback(() => {
    if (!profile?.start_date) {
      setCurrentDayNumber(1);
      setIsLoading(false);
      return;
    }

    try {
      const calculatedDay = getCurrentDayNumber(profile.start_date, planDuration);
      console.log(`🎯 useDateService - Debut: ${profile.start_date}`);
      console.log(`🎯 useDateService - Jour calculé: ${calculatedDay}`);
      setCurrentDayNumber(calculatedDay);
    } catch (error) {
      console.error("Erreur lors du calcul du jour:", error);
      setCurrentDayNumber(1);
    } finally {
      setIsLoading(false);
    }
  }, [profile?.start_date, planDuration]);

  // Recalculer à chaque changement de profil
  useEffect(() => {
    refreshCurrentDay();
  }, [refreshCurrentDay]);

  // Recalculer toutes les heures pour détecter les changements de jour
  useEffect(() => {
    const interval = setInterval(refreshCurrentDay, 60 * 60 * 1000); // 1 heure
    return () => clearInterval(interval);
  }, [refreshCurrentDay]);

  // Navigation entre les jours (mise à jour en DB pour compatibilité)
  const goToNext = useCallback(async () => {
    if (!user?.id || currentDayNumber >= planDuration) return false;
    
    const newDay = currentDayNumber + 1;
    const success = await updateCurrentDay(user.id, newDay, planDuration);
    if (success) {
      setCurrentDayNumber(newDay);
      return true;
    }
    return false;
  }, [user?.id, currentDayNumber, planDuration]);

  const goToPrevious = useCallback(async () => {
    if (!user?.id || currentDayNumber <= 1) return false;
    
    const newDay = currentDayNumber - 1;
    const success = await updateCurrentDay(user.id, newDay, planDuration);
    if (success) {
      setCurrentDayNumber(newDay);
      return true;
    }
    return false;
  }, [user?.id, currentDayNumber]);

  const goToSpecificDay = useCallback(async (dayNumber: number) => {
    if (!user?.id) return false;
    
    const clampedDay = Math.max(1, Math.min(dayNumber, planDuration));
    const success = await updateCurrentDay(user.id, clampedDay, planDuration);
    if (success) {
      setCurrentDayNumber(clampedDay);
      return true;
    }
    return false;
  }, [user?.id, planDuration]);

  // Fonctions utilitaires
  const getDateForCurrentDay = useCallback(() => {
    if (!profile?.start_date) return '';
    return getDateForDay(profile.start_date, currentDayNumber);
  }, [profile?.start_date, currentDayNumber]);

  const checkIsToday = useCallback((dayNumber: number) => {
    if (!profile?.start_date) return false;
    return isToday(profile.start_date, dayNumber);
  }, [profile?.start_date]);

  const getStats = useCallback(() => {
    if (!profile?.start_date) return { currentDay: 1, remainingDays: planDuration - 1, progressPercentage: 0, totalDays: planDuration };
    
    const remainingDays = Math.max(0, planDuration - currentDayNumber);
    const progressPercentage = Math.round((currentDayNumber / planDuration) * 100);
    
    return {
      currentDay: currentDayNumber,
      remainingDays,
      progressPercentage,
      totalDays: planDuration
    };
  }, [profile?.start_date, currentDayNumber, planDuration]);

  return {
    currentDayNumber,
    isLoading,
    goToNext,
    goToPrevious,
    goToSpecificDay,
    getDateForCurrentDay,
    checkIsToday,
    getStats,
    startDate: profile?.start_date,
    planDuration
  };
};
