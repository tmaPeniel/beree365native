
import React from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { useDateService } from '@/hooks/useDateService';

interface DayNavigationControlsProps {
  className?: string;
  size?: 'sm' | 'default' | 'lg';
  onCurrentDayClick?: () => void;
  showNavigationButtons?: boolean;
}

/**
 * Composant pour naviguer entre les jours du plan de lecture
 * VERSION SIMPLIFIÉE - Utilise le service de date centralisé
 */
const DayNavigationControls: React.FC<DayNavigationControlsProps> = ({
  className = '',
  size = 'default',
  onCurrentDayClick,
  showNavigationButtons = false
}) => {
  const {
    currentDayNumber,
    goToNext,
    goToPrevious,
    isLoading
  } = useDateService();

  const canGoBack = currentDayNumber > 1;
  const canGoForward = currentDayNumber < 365;

  const handlePrevious = async () => {
    const success = await goToPrevious();
    if (success && onCurrentDayClick) {
      setTimeout(onCurrentDayClick, 100);
    }
  };

  const handleNext = async () => {
    const success = await goToNext();
    if (success && onCurrentDayClick) {
      setTimeout(onCurrentDayClick, 100);
    }
  };

  if (isLoading) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <div className="animate-pulse bg-gray-200 h-8 w-8 rounded"></div>
        <div className="animate-pulse bg-gray-200 h-4 w-16 rounded"></div>
        <div className="animate-pulse bg-gray-200 h-8 w-8 rounded"></div>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {showNavigationButtons && (
        <Button
          onClick={handlePrevious}
          disabled={!canGoBack}
          variant="outline"
          size="sm"
          className="h-8 w-8 p-0"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
      )}
      
      <button
        onClick={onCurrentDayClick}
        className="flex items-center gap-1 px-3 py-1 bg-green-50 rounded-lg border border-green-200 hover:bg-green-100 transition-colors cursor-pointer"
        title="Aller au jour courant"
      >
        <Calendar className="h-4 w-4 text-green-600" />
        <span className="font-medium text-green-700 min-w-[4rem] text-center">
          Jour {currentDayNumber}
        </span>
      </button>
      
      {showNavigationButtons && (
        <Button
          onClick={handleNext}
          disabled={!canGoForward}
          variant="outline"
          size="sm"
          className="h-8 w-8 p-0"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
};

export default DayNavigationControls;
