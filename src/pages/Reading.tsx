
/**
 * Page de plan de lecture optimisée avec gestion du jour depuis la DB
 * VERSION MISE À JOUR avec synchronisation DB
 */

import React, { useState, useMemo, useEffect, useRef } from 'react';
import NavBar from '@/components/NavBar';
import ExpandedDayCard from '@/components/ExpandedDayCard';
import DayNavigationControls from '@/components/DayNavigationControls';
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';
import { useCurrentDayFromDB } from '@/hooks/useCurrentDayFromDB';
import { getOptimizedReadingPlanData } from '@/services/readingPlan/optimizedCacheService';
import { formatDateToFrench } from '@/utils/readingPlanUtils';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useIsMobile } from '@/hooks/use-mobile';

/**
 * Page de plan de lecture avec gestion DB du jour courant
 */
const Reading = React.memo(() => {
  const {
    profile,
    isLoading: authLoading
  } = useOptimizedAuth();
  const isMobile = useIsMobile();
  const {
    currentDayNumber,
    isLoading: dayLoading
  } = useCurrentDayFromDB();
  const queryClient = useQueryClient();
  const currentDayRef = useRef<HTMLDivElement>(null);

  console.log(`📖 Reading Page - Jour courant depuis DB: ${currentDayNumber}`);

  // Fonction pour scroller vers le jour courant
  const scrollToCurrentDay = () => {
    if (currentDayRef.current) {
      currentDayRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      });
      
      // Ajouter un effet de highlight temporaire
      currentDayRef.current.classList.add('ring-2', 'ring-green-400', 'ring-opacity-75');
      setTimeout(() => {
        if (currentDayRef.current) {
          currentDayRef.current.classList.remove('ring-2', 'ring-green-400', 'ring-opacity-75');
        }
      }, 2000);
    }
  };

  // Invalider le cache quand le jour change pour forcer la synchronisation
  useEffect(() => {
    if (profile?.id) {
      console.log(`🔄 Reading - Invalidation du cache pour jour ${currentDayNumber}`);
      queryClient.invalidateQueries({
        queryKey: ['optimized-reading-plan-data', profile.id]
      });
    }
  }, [currentDayNumber, profile?.id, queryClient]);

  // Une seule requête ultra-optimisée pour TOUT le plan de lecture
  const {
    data: optimizedData = [],
    isLoading: dataLoading,
    error
  } = useQuery({
    queryKey: ['optimized-reading-plan-data', profile?.id],
    queryFn: async () => {
      if (!profile) return [];
      console.log('🚀 Fetching ALL reading plan data in single optimized query...');
      return await getOptimizedReadingPlanData(profile.id, profile.start_date);
    },
    enabled: !!profile && !authLoading,
    staleTime: 5 * 60 * 1000,
    // 5 minutes
    gcTime: 10 * 60 * 1000 // 10 minutes
  });

  // Gestion des erreurs avec useEffect
  useEffect(() => {
    if (error) {
      toast.error(`Impossible de charger le plan de lecture: ${error.message}`);
    }
  }, [error]);

  // Loading state
  if (authLoading || dataLoading || dayLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="bg-white p-4 md:p-6 shadow-sm mb-4 md:mb-6">
        <h1 className="text-xl md:text-2xl font-bold">Plan de lecture</h1>
        <p className="text-gray-500">Suivez votre progression au fil des jours</p>
        
        {/* Contrôles de navigation centralisés */}
        <div className="mt-4 flex justify-center">
          <DayNavigationControls onCurrentDayClick={scrollToCurrentDay} />
        </div>
      </div>
      
      <div className="container mx-auto px-4 pb-16">
        {/* Grille des cartes optimisées avec affichage mobile 2 colonnes */}
        <div className={`grid gap-3 md:gap-6 ${isMobile ? 'grid-cols-2' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'}`}>
          {optimizedData.map(dayData => (
            <div
              key={dayData.day}
              ref={dayData.day === currentDayNumber ? currentDayRef : null}
              className="transition-all duration-300"
            >
              <ExpandedDayCard 
                day={dayData.day} 
                date={dayData.date} 
                isToday={dayData.day === currentDayNumber} 
                chapters={dayData.chapters} 
                progressPercentage={dayData.progressPercentage} 
                isMobile={isMobile} 
              />
            </div>
          ))}
        </div>
      </div>
      
      <NavBar />
    </div>
  );
});

Reading.displayName = 'Reading';
export default Reading;
