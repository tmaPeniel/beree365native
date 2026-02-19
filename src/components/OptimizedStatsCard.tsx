
/**
 * Composant optimisé pour afficher les statistiques de lecture
 * 
 * Fonctionnalités :
 * - Affichage des statistiques de progression globale
 * - Cache intelligent pour éviter les rechargements inutiles
 * - Interface utilisateur responsive et claire
 * - Affichage du nombre de jours complétés à 100%
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
    refetchOnWindowFocus: false, // Ne pas recharger au focus de fenêtre
    gcTime: 10 * 60 * 1000 // Garder en cache pendant 10 minutes
  });

  return (
    <Card>
      <CardContent className="p-6">
        {/* Titre de la section */}
        <h2 className="text-xl font-semibold mb-4">Statistiques de lecture</h2>
        
        {/* État de chargement avec spinner */}
        {statsLoading ? (
          <div className="flex justify-center items-center h-24">
            <div className="animate-gentle-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
          </div>
        ) : (
          /* Grille de statistiques */
          <div className="grid grid-cols-2 gap-4 text-center">
            {/* Jours complétés à 100% */}
            <div className="p-4 bg-primary/10 rounded-lg border-l-4 border-primary">
              <p className="text-muted-foreground text-sm font-medium">Jours complétés</p>
              <p className="text-2xl font-bold text-primary">{stats?.completedDays || 0}</p>
            </div>
            
            {/* Chapitres lus au total */}
            <div className="p-4 bg-accent/10 rounded-lg border-l-4 border-accent">
              <p className="text-muted-foreground text-sm font-medium">Chapitres lus</p>
              <p className="text-2xl font-bold text-accent-foreground">{stats?.passagesRead || 0}</p>
            </div>
            
            {/* Progression totale */}
            <div className="p-4 bg-secondary/50 rounded-lg border-l-4 border-secondary-foreground col-span-2">
              <p className="text-muted-foreground text-sm font-medium">Progression totale</p>
              <p className="text-2xl font-bold text-foreground">{stats?.progressPercentage || 0}%</p>
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
