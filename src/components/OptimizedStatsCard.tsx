
/**
 * Composant optimisé pour afficher les statistiques de lecture
 * 
 * Fonctionnalités :
 * - Affichage des statistiques de progression globale
 * - Cache intelligent pour éviter les rechargements inutiles
 * - Interface utilisateur responsive et claire
 * 
 * Optimisations :
 * - Utilisation de React.memo pour éviter les re-rendus
 * - Cache React Query avec durée appropriée
 * - Gestion d'état de chargement optimisée
 */

import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';
import { getOverallProgress } from '@/services/readingPlan';
import { useQuery } from '@tanstack/react-query';

/**
 * Composant de carte des statistiques optimisé
 * React.memo empêche les re-rendus inutiles
 */
const OptimizedStatsCard = React.memo(() => {
  // Récupération des données d'authentification avec compteur de progression
  const { user, progressUpdateCounter } = useOptimizedAuth();
  
  // Requête optimisée pour les statistiques utilisateur
  // Le cache se met à jour automatiquement quand progressUpdateCounter change
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['userStats', user?.id, progressUpdateCounter],
    queryFn: () => user ? getOverallProgress(user.id) : null,
    enabled: !!user, // Seulement si utilisateur connecté
    staleTime: 5 * 60 * 1000, // Cache valide pendant 5 minutes
    refetchOnWindowFocus: false // Ne pas recharger au focus de fenêtre
  });

  return (
    <Card>
      <CardContent className="p-6">
        {/* Titre de la section */}
        <h2 className="text-xl font-semibold mb-4">Statistiques de lecture</h2>
        
        {/* État de chargement avec spinner */}
        {statsLoading ? (
          <div className="flex justify-center items-center h-24">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-green-500"></div>
          </div>
        ) : (
          /* Grille de statistiques */
          <div className="grid grid-cols-2 gap-4 text-center">
            {/* Jours complétés */}
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-gray-500 text-sm">Jours complétés</p>
              <p className="text-2xl font-bold text-green-500">{stats?.passagesRead || 0}</p>
            </div>
            
            {/* Chapitres lus */}
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-gray-500 text-sm">Chapitres lus</p>
              <p className="text-2xl font-bold text-green-500">{stats?.passagesRead || 0}</p>
            </div>
            
            {/* Progression totale */}
            <div className="p-4 bg-gray-50 rounded-lg col-span-2">
              <p className="text-gray-500 text-sm">Progression totale</p>
              <p className="text-2xl font-bold text-green-500">{stats?.progressPercentage || 0}%</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
});

// Nom d'affichage pour le débogage
OptimizedStatsCard.displayName = 'OptimizedStatsCard';

export default OptimizedStatsCard;
