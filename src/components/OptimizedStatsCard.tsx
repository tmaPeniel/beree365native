
import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';
import { getDetailedUserStats } from '@/services/readingPlan/unifiedStatsService';
import { useQuery } from '@tanstack/react-query';

/**
 * Carte des statistiques optimisée avec métriques séparées
 * Affiche distinctement les jours complétés (100%) et les chapitres lus
 * Utilise le cache global unifié pour la cohérence
 */
const OptimizedStatsCard = React.memo(() => {
  const { user, profile, progressUpdateCounter } = useOptimizedAuth();
  
  // Requête optimisée pour les statistiques détaillées
  const { data: detailedStats, isLoading: statsLoading } = useQuery({
    queryKey: ['detailedUserStats', user?.id, profile?.start_date, progressUpdateCounter],
    queryFn: () => user && profile?.start_date ? getDetailedUserStats(user.id, profile.start_date) : null,
    enabled: !!user && !!profile?.start_date,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000,   // 10 minutes
    refetchOnWindowFocus: false
  });

  if (statsLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <h2 className="text-xl font-semibold mb-4">Statistiques de lecture</h2>
          <div className="flex justify-center items-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-green-500"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-6">
        <h2 className="text-xl font-semibold mb-4">Statistiques de lecture</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-center">
          {/* Jours complétés - Métrique principale */}
          <div className="p-4 bg-green-50 rounded-lg border border-green-200">
            <p className="text-green-700 text-sm font-medium mb-1">Jours complétés</p>
            <p className="text-2xl font-bold text-green-600">{detailedStats?.completedDays || 0}</p>
            <p className="text-xs text-green-600 mt-1">Jours à 100%</p>
          </div>
          
          {/* Chapitres lus - Métrique secondaire */}
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-blue-700 text-sm font-medium mb-1">Chapitres lus</p>
            <p className="text-2xl font-bold text-blue-600">{detailedStats?.completedChapters || 0}</p>
            <p className="text-xs text-blue-600 mt-1">sur {detailedStats?.totalChapters || 0} au total</p>
          </div>
          
          {/* Progression globale - Métrique combinée */}
          <div className="col-span-1 md:col-span-2 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <p className="text-gray-700 text-sm font-medium mb-1">Progression totale</p>
            <div className="flex items-center justify-center gap-2">
              <p className="text-3xl font-bold text-gray-800">{detailedStats?.progressPercentage || 0}%</p>
              <div className="text-xs text-gray-600">
                <p>Moyenne: {detailedStats?.averageCompletionRate || 0}%</p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Informations supplémentaires */}
        {detailedStats && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex justify-between text-xs text-gray-500">
              <span>Taux de complétion quotidien moyen</span>
              <span>{detailedStats.averageCompletionRate}%</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
});

OptimizedStatsCard.displayName = 'OptimizedStatsCard';

export default OptimizedStatsCard;
