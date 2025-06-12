
/**
 * Hook optimisé pour les statistiques unifiées
 * Fournit les données de progression avec distinction jours/chapitres
 */

import { useQuery } from '@tanstack/react-query';
import { useOptimizedAuth } from './useOptimizedAuth';
import { getUnifiedStats, type UnifiedStats } from '@/services/readingPlan/unifiedStatsService';

/**
 * Hook pour récupérer les statistiques unifiées avec cache optimisé
 * @returns Statistiques avec jours complétés et chapitres lus séparés
 */
export const useUnifiedStats = () => {
  const { user, progressUpdateCounter } = useOptimizedAuth();
  
  const {
    data: stats,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['unifiedStats', user?.id, progressUpdateCounter],
    queryFn: () => user ? getUnifiedStats(user.id) : null,
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // Cache pendant 5 minutes
    refetchOnWindowFocus: false,
    retry: 2
  });

  // Valeurs par défaut si pas de données
  const defaultStats: UnifiedStats = {
    totalDays: 365,
    daysCompleted: 0,
    daysRemaining: 365,
    daysCompletedPercentage: 0,
    totalChapters: 0,
    chaptersRead: 0,
    chaptersRemaining: 0,
    chaptersReadPercentage: 0
  };

  return {
    stats: stats || defaultStats,
    isLoading,
    error,
    refetch
  };
};
