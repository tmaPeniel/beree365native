
import React, { useMemo } from 'react';
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';
import { getDayProgress } from '@/services/readingPlan';
import { useQuery } from '@tanstack/react-query';

interface OptimizedDayCardProps {
  day: number;
  date: string;
  completed: boolean;
  onClick: () => void;
  isToday?: boolean;
}

const OptimizedDayCard = React.memo<OptimizedDayCardProps>(({ 
  day, 
  date, 
  completed, 
  onClick, 
  isToday = false
}) => {
  const { user, progressUpdateCounter } = useOptimizedAuth();
  
  // Mémoriser la date formatée
  const formattedDate = useMemo(() => 
    new Date(date).toLocaleDateString('fr-FR', { 
      day: 'numeric', 
      month: 'short' 
    }), [date]
  );
  
  // Requête optimisée pour la progression
  const { data: progressPercentage = 0 } = useQuery({
    queryKey: ['day-progress', user?.id, day, progressUpdateCounter],
    queryFn: () => user ? getDayProgress(user.id, day) : 0,
    enabled: !!user,
    staleTime: 60 * 1000 // 1 minute
  });
  
  // Mémoriser les classes CSS
  const buttonClasses = useMemo(() => 
    `w-full aspect-square rounded-xl flex flex-col items-center justify-center p-2 transition-all relative ${
      isToday 
        ? 'bg-green-600 text-white shadow-md border-2 border-green-700' 
        : completed 
          ? 'bg-green-400 text-white shadow-sm hover:bg-green-600' 
          : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-100'
    }`, [isToday, completed]
  );
  
  return (
    <button onClick={onClick} className={buttonClasses}>
      <span className="text-sm font-semibold">Jour {day}</span>
      <span className="text-xs">{formattedDate}</span>
      
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

OptimizedDayCard.displayName = 'OptimizedDayCard';

export default OptimizedDayCard;
