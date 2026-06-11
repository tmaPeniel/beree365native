import React from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { useDateService } from '@/hooks/useDateService';
import { usePlanDuration } from '@/hooks/usePlanDuration';

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
  const { planDuration } = usePlanDuration();
  
  const canGoBack = currentDayNumber > 1;
  const canGoForward = currentDayNumber < planDuration;
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
    return <div className={`flex items-center gap-2 ${className}`}>
        <div className="animate-pulse-soft bg-muted h-8 w-8 rounded"></div>
        <div className="animate-pulse-soft bg-muted h-4 w-16 rounded"></div>
        <div className="animate-pulse-soft bg-muted h-8 w-8 rounded"></div>
      </div>;
  }
  return <div className={`flex items-center gap-2 ${className}`}>
      {showNavigationButtons}
      
      <button onClick={onCurrentDayClick} className="flex items-center gap-1 px-3 py-1 bg-secondary rounded-lg border border-border hover:bg-secondary/80 transition-colors cursor-pointer" title="Aller au jour courant">
        <Calendar className="h-4 w-4 text-primary" />
        <span className="font-medium text-primary min-w-[4rem] text-center">
          Jour {currentDayNumber}
        </span>
      </button>
      
      {showNavigationButtons}
    </div>;
};
export default DayNavigationControls;