
import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from '@/hooks/useAuth';
import { getOverallProgress } from '@/services/readingPlan';
import { useQuery } from '@tanstack/react-query';

/**
 * Carte affichant les statistiques de lecture de l'utilisateur
 */
const StatsCard = () => {
  const { user, progressUpdateCounter } = useAuth();
  
  // Récupérer les statistiques de l'utilisateur
  // Ajouter progressUpdateCounter à la queryKey pour déclencher la mise à jour automatique
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['userStats', user?.id, progressUpdateCounter],
    queryFn: () => user ? getOverallProgress(user.id) : null,
    enabled: !!user
  });

  return (
    <Card>
      <CardContent className="p-6">
        <h2 className="text-xl font-semibold mb-4">Statistiques de lecture</h2>
        {statsLoading ? (
          <div className="flex justify-center items-center h-24">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-green-500"></div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 text-center">
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-gray-500 text-sm">Jours complétés</p>
              <p className="text-2xl font-bold text-green-500">{stats?.passagesRead || 0}</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-gray-500 text-sm">Chapitres lus</p>
              <p className="text-2xl font-bold text-green-500">{stats?.passagesRead || 0}</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg col-span-2">
              <p className="text-gray-500 text-sm">Progression totale</p>
              <p className="text-2xl font-bold text-green-500">{stats?.progressPercentage || 0}%</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default StatsCard;
