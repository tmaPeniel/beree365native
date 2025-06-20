
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
      
      {/* Bouton pour afficher/masquer les diagnostics */}
      <div className="mt-2 text-center">
        <button
          onClick={() => setShowDiagnostics(!showDiagnostics)}
          className="text-xs text-gray-400 hover:text-gray-600"
        >
          {showDiagnostics ? 'Masquer' : 'Afficher'} les diagnostics
        </button>
      </div>
      
      {/* Composant de diagnostics */}
      <ReadingPlanDiagnostics 
        dayNumber={dayNumber} 
        visible={showDiagnostics}
      />
    </div>
  );
};

export default ReadingPlan;
