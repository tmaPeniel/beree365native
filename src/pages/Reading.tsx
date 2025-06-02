
/**
 * Page de plan de lecture optimisée avec lazy loading
 * VERSION MISE À JOUR avec virtualisation et chargement progressif
 */

import React, { useState, useCallback, useRef } from 'react';
import NavBar from '@/components/NavBar';
import VirtualizedReadingGrid from '@/components/VirtualizedReadingGrid';
import DayNavigator from '@/components/DayNavigator';
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';
import { useCurrentDayFromDB } from '@/hooks/useCurrentDayFromDB';
import { useLazyReadingData } from '@/hooks/useLazyReadingData';
import { getOptimizedReadingPlanData } from '@/services/readingPlan/optimizedCacheService';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';

/**
 * Page de plan de lecture avec lazy loading et virtualisation
 */
const Reading = React.memo(() => {
  const {
    profile,
    isLoading: authLoading
  } = useOptimizedAuth();
  const {
    currentDayNumber,
    isLoading: dayLoading,
    goToSpecificDay
  } = useCurrentDayFromDB();
  
  const [scrollToDay, setScrollToDay] = useState<((day: number) => void) | null>(null);

  console.log(`📖 Reading Page - Current day: ${currentDayNumber}`);

  // Requête optimisée pour TOUT le plan de lecture
  const {
    data: optimizedData = [],
    isLoading: dataLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['optimized-reading-plan-data', profile?.id],
    queryFn: async () => {
      if (!profile) return [];
      console.log('🚀 Fetching ALL reading plan data...');
      return await getOptimizedReadingPlanData(profile.id, profile.start_date);
    },
    enabled: !!profile && !authLoading,
    staleTime: 3 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: 2,
    retryDelay: 1000
  });

  // Hook de lazy loading
  const {
    loadedData,
    loadAroundDay,
    updateVisibleRange
  } = useLazyReadingData({
    data: optimizedData,
    pageSize: 50,
    prefetchSize: 20
  });

  // Navigation vers un jour spécifique
  const handleNavigateToDay = useCallback(async (dayNumber: number) => {
    // Charger les données autour de ce jour
    loadAroundDay(dayNumber);
    
    // Mettre à jour le jour courant en DB
    await goToSpecificDay(dayNumber);
    
    // Scroller vers le jour
    if (scrollToDay) {
      setTimeout(() => {
        scrollToDay(dayNumber);
      }, 100);
    }
  }, [loadAroundDay, goToSpecificDay, scrollToDay]);

  // Scroll vers le jour courant
  const handleCurrentDayClick = useCallback(() => {
    if (currentDayNumber && scrollToDay) {
      loadAroundDay(currentDayNumber);
      setTimeout(() => {
        scrollToDay(currentDayNumber);
      }, 100);
    }
  }, [currentDayNumber, scrollToDay, loadAroundDay]);

  // Charger initialement les données autour du jour courant
  React.useEffect(() => {
    if (currentDayNumber && optimizedData.length > 0) {
      loadAroundDay(currentDayNumber);
    }
  }, [currentDayNumber, optimizedData.length, loadAroundDay]);

  // Gestion des erreurs
  React.useEffect(() => {
    if (error) {
      console.error('Error loading reading plan:', error);
      toast.error(`Impossible de charger le plan de lecture. Tentative de rechargement...`);
      setTimeout(() => {
        refetch();
      }, 2000);
    }
  }, [error, refetch]);

  // Loading state
  if (authLoading || dayLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement du plan de lecture...</p>
        </div>
      </div>
    );
  }

  if (dataLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white p-4 md:p-6 shadow-sm mb-4 md:mb-6">
          <h1 className="text-xl md:text-2xl font-bold">Plan de lecture</h1>
          <p className="text-gray-500">Chargement de vos données...</p>
        </div>
        <div className="container mx-auto px-4 pb-16">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500 mx-auto mb-4"></div>
            <p className="text-gray-600">Chargement des passages...</p>
          </div>
        </div>
        <NavBar />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white p-4 md:p-6 shadow-sm mb-4 md:mb-6">
          <h1 className="text-xl md:text-2xl font-bold">Plan de lecture</h1>
          <p className="text-red-500">Une erreur est survenue</p>
        </div>
        <div className="container mx-auto px-4 pb-16">
          <div className="text-center py-12">
            <p className="text-red-600 mb-4">Impossible de charger le plan de lecture</p>
            <button 
              onClick={() => refetch()} 
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
            >
              Réessayer
            </button>
          </div>
        </div>
        <NavBar />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="bg-white p-4 md:p-6 shadow-sm mb-4 md:mb-6">
        <h1 className="text-xl md:text-2xl font-bold">Plan de lecture</h1>
        <p className="text-gray-500">
          Suivez votre progression au fil des jours ({optimizedData.length} jours disponibles)
        </p>
        
        {/* Navigateur de jours amélioré */}
        <div className="mt-4 flex justify-center">
          <DayNavigator
            currentDay={currentDayNumber}
            totalDays={365}
            onNavigateToDay={handleNavigateToDay}
            onCurrentDayClick={handleCurrentDayClick}
          />
        </div>
      </div>
      
      <div className="container mx-auto px-4 pb-16">
        {optimizedData.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600">Aucune donnée de plan de lecture disponible</p>
            <button 
              onClick={() => refetch()} 
              className="mt-4 px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
            >
              Recharger
            </button>
          </div>
        ) : (
          /* Grille virtualisée avec lazy loading */
          <VirtualizedReadingGrid
            data={optimizedData}
            currentDayNumber={currentDayNumber}
            onScrollToDay={setScrollToDay}
          />
        )}
      </div>
      
      <NavBar />
    </div>
  );
});

Reading.displayName = 'Reading';
export default Reading;
