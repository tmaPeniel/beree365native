
/**
 * Page de plan de lecture optimisée avec une seule requête
 * VERSION CORRIGÉE avec synchronisation des jours
 */

import React, { useState, useMemo, useEffect } from 'react';
import NavBar from '@/components/NavBar';
import ExpandedDayCard from '@/components/ExpandedDayCard';
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';
import { useCurrentDay } from '@/hooks/useCurrentDay';
import { getOptimizedReadingPlanData } from '@/services/readingPlan/optimizedCacheService';
import { formatDateToFrench } from '@/utils/readingPlanUtils';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useIsMobile } from '@/hooks/use-mobile';

/**
 * Page de plan de lecture ultra-optimisée CORRIGÉE
 */
const Reading = React.memo(() => {
  const { profile, isLoading: authLoading } = useOptimizedAuth();
  const isMobile = useIsMobile();
  const { currentDayNumber } = useCurrentDay();
  const queryClient = useQueryClient();

  console.log(`📖 Reading Page - Jour courant: ${currentDayNumber}`);

  // Invalider le cache au chargement pour forcer la synchronisation
  useEffect(() => {
    if (profile?.id) {
      console.log(`🔄 Reading - Invalidation du cache pour synchronisation`);
      queryClient.invalidateQueries({ 
        queryKey: ['optimized-reading-plan-data', profile.id] 
      });
    }
  }, [profile?.id, queryClient]);

  // Une seule requête ultra-optimisée pour TOUT le plan de lecture
  const { data: optimizedData = [], isLoading: dataLoading, error } = useQuery({
    queryKey: ['optimized-reading-plan-data', profile?.id],
    queryFn: async () => {
      if (!profile) return [];
      
      console.log('🚀 Fetching ALL reading plan data in single optimized query...');
      
      return await getOptimizedReadingPlanData(profile.id, profile.start_date);
    },
    enabled: !!profile && !authLoading,
    staleTime: 5 * 60 * 1000, // 5 minutes - cache plus court pour debug
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  // Gestion des erreurs avec useEffect
  useEffect(() => {
    if (error) {
      toast.error(`Impossible de charger le plan de lecture: ${error.message}`);
    }
  }, [error]);

  // Loading state
  if (authLoading || dataLoading) {
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
      </div>
      
      <div className="container mx-auto px-4 pb-16">
        {/* Affichage du jour actuel sur mobile - VERSION CORRIGÉE */}
        <div className="md:hidden mb-4 p-4 bg-green-50 rounded-lg border border-green-100">
          <p className="font-medium">Aujourd'hui: Jour {currentDayNumber}</p>
          <p className="text-sm text-gray-600">Debug: Jour calculé = {currentDayNumber}</p>
        </div>
        
        {/* Grille des cartes optimisées avec affichage mobile 2 colonnes */}
        <div className={`grid gap-3 md:gap-6 ${
          isMobile 
            ? 'grid-cols-2' 
            : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
        }`}>
          {optimizedData.map(dayData => (
            <ExpandedDayCard 
              key={dayData.day} 
              day={dayData.day} 
              date={dayData.date}
              isToday={dayData.isToday}
              chapters={dayData.chapters}
              progressPercentage={dayData.progressPercentage}
              isMobile={isMobile}
            />
          ))}
        </div>
      </div>
      
      <NavBar />
    </div>
  );
});

Reading.displayName = 'Reading';

export default Reading;
