/**
 * Hook pour récupérer la durée du plan de lecture sélectionné par l'utilisateur
 */

import { useQuery } from '@tanstack/react-query';
import { useOptimizedAuth } from './useOptimizedAuth';
import { getUserPlan } from '@/services/readingPlan/planService';

export const usePlanDuration = () => {
  const { user, isLoading: authLoading } = useOptimizedAuth();
  
  const { data: planData, isLoading: planLoading } = useQuery({
    queryKey: ['user-plan-duration', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      return await getUserPlan(user.id);
    },
    enabled: !!user?.id && !authLoading,
    staleTime: 5 * 60 * 1000, // Cache valide pendant 5 minutes
    gcTime: 10 * 60 * 1000, // Garde en mémoire pendant 10 minutes
  });

  return {
    planDuration: planData?.duration_days || 365, // Fallback à 365 si pas de plan
    isLoading: authLoading || planLoading,
    planName: planData?.name,
    planDescription: planData?.description,
    planImageUrl: planData?.image_url
  };
};