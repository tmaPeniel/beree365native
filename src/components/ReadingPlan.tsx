
/**
 * Composant pour afficher le plan de lecture quotidien
 * Version mise à jour utilisant les composants optimisés
 */

import React from 'react';
import OptimizedReadingPlan from './OptimizedReadingPlan';

interface ReadingPlanProps {
  dayNumber: number;
  onToggleRead?: (id: string) => void;
}

/**
 * Wrapper pour maintenir la compatibilité avec l'ancien composant
 */
const ReadingPlan: React.FC<ReadingPlanProps> = ({ dayNumber }) => {
  return <OptimizedReadingPlan dayNumber={dayNumber} />;
};

export default ReadingPlan;
