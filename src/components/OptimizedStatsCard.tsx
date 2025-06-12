
/**
 * Carte des statistiques optimisée avec distinction entre jours complétés et chapitres lus
 * Utilise le service unifié pour des données cohérentes et un cache optimisé
 */

import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';
import { getUnifiedStats } from '@/services/readingPlan/unifiedStatsService';
import { useQuery } from '@tanstack/react-query';

/**
 * Composant optimisé pour afficher les statistiques de lecture
 * Sépare clairement les jours complétés (100%) des chapitres lus individuellement
 */
const OptimizedStatsCard = React.memo(() => {
  const { user, progressUpdateCounter } = useOptimizedAuth();
  
  // Requête optimisée avec React Query pour les statistiques unifiées
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['unifiedStats', user?.id, progressUpdateCounter],
    queryFn: () => user ? getUnifiedStats(user.id) : null,
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // Cache pendant 5 minutes
    refetchOnWindowFocus: false,
    retry: 2
  });

  console.log('📊 OptimizedStatsCard - Statistiques reçues:', stats);

  if (statsLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <h2 className="text-xl font-semibold mb-4">Statistiques de lecture</h2>
          <div className="flex justify-center items-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-green-500"></div>
            <span className="ml-2 text-gray-500">Chargement des statistiques...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-6">
        <h2 className="text-xl font-semibold mb-4 text-center text-blue-600 bg-blue-50 py-2 rounded-md">
          STATISTIQUES DE LECTURE
        </h2>
        
        <div className="space-y-4">
          {/* Section Jours Complétés */}
          <div className="bg-green-50 p-4 rounded-lg border-l-4 border-green-500">
            <h3 className="text-lg font-medium text-green-700 mb-3">Jours Complétés (100%)</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <p className="text-sm text-gray-600">Jours terminés</p>
                <p className="text-2xl font-bold text-green-600">{stats?.daysCompleted || 0}</p>
                <p className="text-xs text-gray-500">sur {stats?.totalDays || 365}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-600">Progression</p>
                <p className="text-2xl font-bold text-green-600">{stats?.daysCompletedPercentage || 0}%</p>
                <p className="text-xs text-gray-500">des jours complétés</p>
              </div>
            </div>
          </div>

          {/* Section Chapitres Individuels */}
          <div className="bg-blue-50 p-4 rounded-lg border-l-4 border-blue-500">
            <h3 className="text-lg font-medium text-blue-700 mb-3">Chapitres Individuels</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <p className="text-sm text-gray-600">Chapitres lus</p>
                <p className="text-2xl font-bold text-blue-600">{stats?.chaptersRead || 0}</p>
                <p className="text-xs text-gray-500">sur {stats?.totalChapters || 0}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-600">Progression</p>
                <p className="text-2xl font-bold text-blue-600">{stats?.chaptersReadPercentage || 0}%</p>
                <p className="text-xs text-gray-500">des chapitres lus</p>
              </div>
            </div>
          </div>

          {/* Section Restant */}
          <div className="bg-gray-50 p-4 rounded-lg border-l-4 border-gray-400">
            <h3 className="text-lg font-medium text-gray-700 mb-3">Restant à faire</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <p className="text-sm text-gray-600">Jours restants</p>
                <p className="text-2xl font-bold text-gray-600">{stats?.daysRemaining || 365}</p>
                <p className="text-xs text-gray-500">à compléter</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-600">Chapitres restants</p>
                <p className="text-2xl font-bold text-gray-600">{stats?.chaptersRemaining || 0}</p>
                <p className="text-xs text-gray-500">à lire</p>
              </div>
            </div>
          </div>
        </div>

        {/* Légende explicative */}
        <div className="mt-4 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
          <p className="text-xs text-yellow-800">
            <strong>Jour complété :</strong> Tous les chapitres du jour sont marqués comme lus (100%).
            <br />
            <strong>Chapitre lu :</strong> Chapitres individuels marqués comme lus, même si le jour n'est pas complété.
          </p>
        </div>
      </CardContent>
    </Card>
  );
});

OptimizedStatsCard.displayName = 'OptimizedStatsCard';

export default OptimizedStatsCard;
