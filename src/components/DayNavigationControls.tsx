import React from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { useCurrentDayFromDB } from '@/hooks/useCurrentDayFromDB';
interface DayNavigationControlsProps {
  className?: string;
  size?: 'sm' | 'default' | 'lg';
}

/**
 * Composant pour naviguer entre les jours du plan de lecture
 */
const DayNavigationControls: React.FC<DayNavigationControlsProps> = ({
  className = '',
  size = 'default'
}) => {
  const {
    currentDayNumber,
    goToNext,
    goToPrevious,
    isLoading
  } = useCurrentDayFromDB();
  const canGoBack = currentDayNumber > 1;
  const canGoForward = currentDayNumber < 365;
  if (isLoading) {
    return <div className={`flex items-center gap-2 ${className}`}>
        <div className="animate-pulse bg-gray-200 h-8 w-8 rounded"></div>
        <div className="animate-pulse bg-gray-200 h-4 w-16 rounded"></div>
        <div className="animate-pulse bg-gray-200 h-8 w-8 rounded"></div>
      </div>;
  }
  return <div className={`flex items-center gap-2 ${className}`}>
      

      <div className="flex items-center gap-1 px-3 py-1 bg-green-50 rounded-lg border border-green-200">
        <Calendar className="h-4 w-4 text-green-600" />
        <span className="font-medium text-green-700 min-w-[4rem] text-center">
          Jour {currentDayNumber}
        </span>
      </div>

      
    </div>;
};
export default DayNavigationControls;