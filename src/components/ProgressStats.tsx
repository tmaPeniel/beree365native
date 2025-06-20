
/**
 * Composant de statistiques de progression
 * Affiche la progression globale de l'utilisateur dans le plan de lecture
 */

import React, { useEffect, useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import CircularProgress from '@/components/CircularProgress';
import { useIsMobile } from '@/hooks/use-mobile';
import { useAuth } from '@/hooks/useAuth';
import { getOverallProgress } from '@/services/readingPlan';
import { toast } from 'sonner';

/**
 * Interface pour les statistiques de progression
 */
interface ProgressStatsData {
  totalPassages: number;
  passagesRead: number;
  passagesRemaining: number;
  progressPercentage: number;
}

const ProgressStats = () => {
  const isMobile = useIsMobile();
  const { user, progressUpdateCounter } = useAuth();
  
  // État local pour les statistiques
  const [stats, setStats] = useState<ProgressStatsData>({
    totalPassages: 0,
    passagesRead: 0,
    passagesRemaining: 0,
    progressPercentage: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  
  // Effet pour charger les statistiques
  useEffect(() => {
    const fetchStats = async () => {
      if (!user) return;
      
      setIsLoading(true);
      try {
        console.log('Fetching progress stats for user:', user.id);
        const progress = await getOverallProgress(user.id);
        setStats(progress);
        console.log('Progress stats loaded:', progress);
      } catch (error) {
        console.error("Erreur lors du chargement des statistiques:", error);
        toast.error("Impossible de charger les statistiques");
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchStats();
  }, [user, progressUpdateCounter]);
  
  // Affichage du loader pendant le chargement
  if (isLoading) {
    return (
      <Card className="bg-white border-none shadow-sm">
        <CardContent className="p-4 md:p-6">
          <div className="flex justify-center items-center h-48">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-green-500"></div>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card className="bg-white border-none shadow-sm">
      <CardContent className="p-4 md:p-6">
        {/* En-tête de la section */}
        <h2 className="text-md md:text-lg font-semibold mb-4 text-center text-blue-600 bg-blue-50 py-2 rounded-md">
          PROGRESSION GLOBALE
        </h2>
        
        <div className="flex flex-col md:flex-row items-center gap-4">
          {/* Partie gauche - Statistiques textuelles */}
          <div className="w-full md:w-3/5 space-y-2 md:space-y-3">
            {/* Total de passages à lire */}
            <div className="grid grid-cols-2 items-center bg-purple-50 p-2 md:p-3 rounded-md">
              <span className="text-sm md:text-base text-gray-700 font-medium">Total de Passages à lire</span>
              <span className="text-right font-bold text-sm md:text-base">{stats.totalPassages}</span>
            </div>
            
            {/* Total de passages lus */}
            <div className="grid grid-cols-2 items-center bg-orange-100 p-2 md:p-3 rounded-md">
              <span className="text-sm md:text-base text-gray-700 font-medium">Total de Passages lus</span>
              <span className="text-right font-bold text-sm md:text-base">{stats.passagesRead}</span>
            </div>
            
            {/* Total passages restants */}
            <div className="grid grid-cols-2 items-center bg-gray-100 p-2 md:p-3 rounded-md border-r-2 border-gray-400">
              <span className="text-sm md:text-base text-gray-700 font-medium">Total Passages restants</span>
              <span className="text-right font-bold text-sm md:text-base">{stats.passagesRemaining}</span>
            </div>
          </div>
          
          {/* Partie droite - Cercle de progression */}
          <div className="w-full md:w-2/5 flex justify-center">
            <CircularProgress 
              progress={stats.progressPercentage} 
              size={isMobile ? 120 : 140}
              className="text-green-500"
            />
          </div>
        </div>

        {/* Légende */}
        <div className="flex justify-center mt-3 md:mt-4">
          <div className="flex items-center space-x-3 md:space-x-4">
            <div className="flex items-center">
              <div className="w-3 h-3 bg-green-500 rounded-full mr-1"></div>
              <span className="text-xs text-gray-600">Passages Lus</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-gray-500 rounded-full mr-1"></div>
              <span className="text-xs text-gray-600">Restants</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ProgressStats;
