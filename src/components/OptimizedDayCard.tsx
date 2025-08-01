
/**
 * Composant optimisé pour afficher une carte de jour du plan de lecture
 * 
 * Fonctionnalités :
 * - Affichage compact du jour avec sa date
 * - Indicateur de progression visuel
 * - Support de l'état "aujourd'hui" avec style spécial
 * - Optimisations de performance avec React.memo et useMemo
 * 
 * Utilisé dans : Liste/grille des jours du plan de lecture
 */

import React, { useMemo } from 'react';
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';
import { getDayProgress } from '@/services/readingPlan';
import { useQuery } from '@tanstack/react-query';

// Interface pour les propriétés du composant
interface OptimizedDayCardProps {
  day: number;           // Numéro du jour (1-365)
  date: string;          // Date au format ISO
  completed: boolean;    // Indique si le jour est entièrement complété
  onClick: () => void;   // Fonction appelée au clic
  isToday?: boolean;     // Indique si c'est le jour actuel
}

/**
 * Composant de carte de jour optimisé
 * React.memo empêche les re-rendus inutiles quand les props n'ont pas changé
 */
const OptimizedDayCard = React.memo<OptimizedDayCardProps>(({ 
  day, 
  date, 
  completed, 
  onClick, 
  isToday = false
}) => {
  // Récupération des données utilisateur et du compteur de progression
  const { user, progressUpdateCounter } = useOptimizedAuth();
  
  // Mémorisation de la date formatée pour éviter les recalculs
  const formattedDate = useMemo(() => 
    new Date(date).toLocaleDateString('fr-FR', { 
      day: 'numeric', 
      month: 'short' 
    }), [date]
  );
  
  // Requête optimisée pour récupérer le pourcentage de progression du jour
  const { data: progressPercentage = 0 } = useQuery({
    queryKey: ['day-progress', user?.id, day, progressUpdateCounter],
    queryFn: () => user ? getDayProgress(user.id, day) : 0,
    enabled: !!user, // Seulement si utilisateur connecté
    staleTime: 60 * 1000 // Cache valide pendant 1 minute
  });
  
  // Mémorisation des classes CSS pour éviter les recalculs à chaque render
  const buttonClasses = useMemo(() => 
    `w-full aspect-square rounded-xl flex flex-col items-center justify-center p-2 transition-all duration-300 relative transform hover:scale-105 active:scale-95 animate-fade-in ${
      isToday 
        ? 'bg-green-600 text-white shadow-md border-2 border-green-700 animate-pulse-gentle' // Style pour le jour actuel avec animation
        : completed 
          ? 'bg-green-400 text-white shadow-sm hover:bg-green-600 hover:shadow-lg' // Style pour jour complété
          : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-100 hover:shadow-md' // Style par défaut
    }`, [isToday, completed]
  );
  
  return (
    <button onClick={onClick} className={buttonClasses}>
      {/* Numéro du jour */}
      <span className="text-sm font-semibold">Jour {day}</span>
      
      {/* Date formatée */}
      <span className="text-xs">{formattedDate}</span>
      
      {/* Indicateur de progression si > 0% */}
      {progressPercentage > 0 && (
        <div className="absolute bottom-1 left-0 right-0 flex justify-center">
          <span className="text-xs font-medium bg-white/80 text-green-800 px-1 rounded-sm">
            {progressPercentage}%
          </span>
        </div>
      )}
    </button>
  );
});

// Nom d'affichage pour le débogage React DevTools
OptimizedDayCard.displayName = 'OptimizedDayCard';

export default OptimizedDayCard;
