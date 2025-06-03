
/**
 * Page de plan de lecture avec système de date simplifié
 */

import React, { useState, useEffect, useRef } from 'react';
import NavBar from '@/components/NavBar';
import ExpandedDayCard from '@/components/ExpandedDayCard';
import DayNavigationControls from '@/components/DayNavigationControls';
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';
import { useDateService } from '@/hooks/useDateService';
import { getOptimizedReadingPlanData } from '@/services/readingPlan/optimizedCacheService';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useIsMobile } from '@/hooks/use-mobile';

const Reading = React.memo(() => {
  const { profile, isLoading: authLoading } = useOptimizedAuth();
  const isMobile = useIsMobile();
  const { currentDayNumber, isLoading: dayLoading } = useDateService();
  const currentDayRef = useRef<HTMLDivElement>(null);
  const [hasScrolledToDay, setHasScrolledToDay] = useState(false);

  console.log(`📖 Reading Page - Current day: ${currentDayNumber}`);

  const scrollToCurrentDay = () => {
    console.log(`🎯 Scroll vers le jour ${currentDayNumber}`);
    
    if (currentDayRef.current) {
      currentDayRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      });
      
      currentDayRef.current.classList.add('ring-2', 'ring-green-400', 'ring-opacity-75');
      setTimeout(() => {
        if (currentDayRef.current) {
          currentDayRef.current.classList.remove('ring-2', 'ring-green-400', 'ring-opacity-75');
        }
      }, 2000);
      
      toast.success(`Navigation vers le jour ${currentDayNumber}`);
    } else {
      toast.error(`Impossible de trouver le jour ${currentDayNumber}`);
    }
  };

  const { data: optimizedData = [], isLoading: dataLoading, error, refetch } = useQuery({
    queryKey: ['optimized-reading-plan-data', profile?.id],
    queryFn: async () => {
      if (!profile) return [];
      return await getOptimizedReadingPlanData(profile.id, profile.start_date);
    },
    enabled: !!profile && !authLoading,
    staleTime: 3 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: 2,
    retryDelay: 1000
  });

  useEffect(() => {
    if (error) {
      console.error('Error loading reading plan:', error);
      toast.error(`Impossible de charger le plan de lecture. Tentative de rechargement...`);
      setTimeout(() => refetch(), 2000);
    }
  }, [error, refetch]);

  useEffect(() => {
    if (!hasScrolledToDay && optimizedData.length > 0 && currentDayNumber && !dataLoading) {
      setTimeout(() => {
        scrollToCurrentDay();
        setHasScrolledToDay(true);
      }, 500);
    }
  }, [optimizedData.length, currentDayNumber, dataLoading, hasScrolledToDay]);

  useEffect(() => {
    setHasScrolledToDay(false);
  }, [currentDayNumber]);

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
        
        <div className="mt-4 flex justify-center">
          <DayNavigationControls 
            onCurrentDayClick={scrollToCurrentDay}
            showNavigationButtons={true}
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
        )}
      </div>
      
      <NavBar />
    </div>
  );
});

Reading.displayName = 'Reading';
export default Reading;
