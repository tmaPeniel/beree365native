import { useState, useEffect } from 'react';
import { useOptimizedAuth } from '@/features/auth/hooks/useOptimizedAuth';
import { getDayProgress } from '@/features/reading/services/readingPlan';
import { useQuery } from '@tanstack/react-query';

export const useDayCompletion = (dayNumber: number) => {
  const { user, progressUpdateCounter } = useOptimizedAuth();
  const [wasIncomplete, setWasIncomplete] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);

  // Surveiller le progrès du jour
  const { data: progressPercentage = 0, isLoading } = useQuery({
    queryKey: ['day-progress', user?.id, dayNumber, progressUpdateCounter],
    queryFn: () => user ? getDayProgress(user.id, dayNumber) : 0,
    enabled: !!user && !!dayNumber,
    staleTime: 30 * 1000,
    refetchInterval: false // Désactiver le polling automatique
  });

  const isComplete = progressPercentage === 100;

  useEffect(() => {
    // Si le jour était incomplet et devient complet, déclencher la célébration
    if (wasIncomplete && isComplete && !isLoading && progressPercentage === 100) {
      setShowCelebration(true);
      
      // Réinitialiser après animation (durée réduite)
      setTimeout(() => {
        setShowCelebration(false);
      }, 2500); // Réduit de 3000 à 2500ms
    }
    
    // Mettre à jour l'état de completion précédent seulement si pas en cours de chargement
    if (!isLoading && progressPercentage !== undefined) {
      setWasIncomplete(!isComplete);
    }
  }, [isComplete, wasIncomplete, isLoading, progressPercentage]);

  return {
    isComplete,
    progressPercentage,
    showCelebration,
    isLoading
  };
};