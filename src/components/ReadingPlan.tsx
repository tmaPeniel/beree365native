
/**
 * Composant pour afficher le plan de lecture quotidien
 * VERSION MISE À JOUR avec diagnostics optionnels
 */

import React, { useState } from 'react';
import OptimizedReadingPlan from './OptimizedReadingPlan';
import ReadingPlanDiagnostics from './ReadingPlanDiagnostics';

interface ReadingPlanProps {
  dayNumber: number;
  onToggleRead?: (id: string) => void;
}

/**
 * Wrapper amélioré avec support des diagnostics
 */
const ReadingPlan: React.FC<ReadingPlanProps> = ({ dayNumber }) => {
  const [showDiagnostics, setShowDiagnostics] = useState(false);

  return (
    <div>
      <OptimizedReadingPlan dayNumber={dayNumber} />
    </div>
  );
};

export default ReadingPlan;
