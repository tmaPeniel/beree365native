
import { useState, useEffect, useCallback } from 'react';
import { useOptimizedAuth } from './useOptimizedAuth';
import { getCurrentDayNumber, getDateForDay, isToday, getPlanStats } from '@/services/dateService';
import { updateCurrentDay } from '@/services/dayService';

/**
 * Hook centralisé pour gérer les dates du plan de lecture
 * VERSION UNIFIÉE - Utilise le cache global optimisé pour la cohérence
 * 
 * Ce hook gère :
 * - Le calcul du jour courant basé sur la date de début
 * - La navigation entre les jours
 * - La synchronisation avec le cache global
 * - Les fonctions utilitaires de date
 */
export const useDateService = () => {
  const { profile, user } = useOptimizedAuth();
  const [currentDayNumber, setCurrentDayNumber] = useState<number>(1);
  const [isLoading, setIsLoading] = useState(true);

  /**
   * Calcule et met à jour le jour courant basé sur la date de début du profil
   * Utilise le service de date centralisé pour la cohérence
   */
  const refreshCurrentDay = useCallback(() => {
    if (!profile?.start_date) {
      setCurrentDayNumber(1);
      setIsLoading(false);
      return;
    }

    try {
      const calculatedDay = getCurrentDayNumber(profile.start_date);
      console.log(`🎯 useDateService - Date de début: ${profile.start_date}`);
      console.log(`🎯 useDateService - Jour calculé: ${calculatedDay}`);
      setCurrentDayNumber(calculatedDay);
    } catch (error) {
      console.error("Erreur lors du calcul du jour:", error);
      setCurrentDayNumber(1);
    } finally {
      setIsLoading(false);
    }
  }, [profile?.start_date]);

  // Recalculer à chaque changement de profil
  useEffect(() => {
    refreshCurrentDay();
  }, [refreshCurrentDay]);

  // Recalculer toutes les heures pour détecter les changements de jour
  useEffect(() => {
    const interval = setInterval(refreshCurrentDay, 60 * 60 * 1000); // 1 heure
    return () => clearInterval(interval);
  }, [refreshCurrentDay]);

  /**
   * Navigue vers le jour suivant
   * Met à jour la base de données pour la compatibilité et synchronise le cache
   */
  const goToNext = useCallback(async () => {
    if (!user?.id || currentDayNumber >= 365) return false;
    
    const newDay = currentDayNumber + 1;
    const success = await updateCurrentDay(user.id, newDay);
    if (success) {
      setCurrentDayNumber(newDay);
      return true;
    }
    return false;
  }, [user?.id, currentDayNumber]);

  /**
   * Navigue vers le jour précédent
   * Met à jour la base de données pour la compatibilité et synchronise le cache
   */
  const goToPrevious = useCallback(async () => {
    if (!user?.id || currentDayNumber <= 1) return false;
    
    const newDay = currentDayNumber - 1;
    const success = await updateCurrentDay(user.id, newDay);
    if (success) {
      setCurrentDayNumber(newDay);
      return true;
    }
    return false;
  }, [user?.id, currentDayNumber]);

  /**
   * Navigue vers un jour spécifique
   * Valide la plage et met à jour la base de données
   */
  const goToSpecificDay = useCallback(async (dayNumber: number) => {
    if (!user?.id) return false;
    
    const clampedDay = Math.max(1, Math.min(dayNumber, 365));
    const success = await updateCurrentDay(user.id, clampedDay);
    if (success) {
      setCurrentDayNumber(clampedDay);
      return true;
    }
    return false;
  }, [user?.id]);

  /**
   * Calcule la date correspondant au jour courant
   * Utilise le service de date centralisé
   */
  const getDateForCurrentDay = useCallback(() => {
    if (!profile?.start_date) return '';
    return getDateForDay(profile.start_date, currentDayNumber);
  }, [profile?.start_date, currentDayNumber]);

  /**
   * Vérifie si un jour donné correspond à aujourd'hui
   */
  const checkIsToday = useCallback((dayNumber: number) => {
    if (!profile?.start_date) return false;
    return isToday(profile.start_date, dayNumber);
  }, [profile?.start_date]);

  /**
   * Calcule les statistiques du plan de lecture
   * Utilise le service centralisé pour la cohérence
   */
  const getStats = useCallback(() => {
    if (!profile?.start_date) return { currentDay: 1, remainingDays: 364, progressPercentage: 0, totalDays: 365 };
    return getPlanStats(profile.start_date);
  }, [profile?.start_date]);

  return {
    // État principal
    currentDayNumber,
    isLoading,
    
    // Actions de navigation
    refreshCurrentDay,
    goToNext,
    goToPrevious,
    goToSpecificDay,
    
    // Fonctions utilitaires
    getDateForCurrentDay,
    checkIsToday,
    getStats,
    
    // Données de base
    startDate: profile?.start_date
  };
};
