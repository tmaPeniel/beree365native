
import React from 'react';

interface DayCardProps {
  day: number;
  date: string;
  completed: boolean;
  onClick: () => void;
  isToday?: boolean;
  progressPercentage?: number; // New prop for daily progress
}

const DayCard: React.FC<DayCardProps> = ({ 
  day, 
  date, 
  completed, 
  onClick, 
  isToday = false,
  progressPercentage = 0 
}) => {
  const formattedDate = new Date(date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  
  return (
    <button 
      onClick={onClick}
      className={`w-full aspect-square rounded-lg flex flex-col items-center justify-center p-2 transition-all relative
        ${isToday 
          ? 'bg-green-600 text-white shadow-lg border-2 border-green-700' 
          : completed 
            ? 'bg-green-400 text-white shadow-md hover:bg-green-600' 
            : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
        }`}
    >
      <span className="text-sm font-semibold">Jour {day}</span>
      <span className="text-xs">{formattedDate}</span>
      
      {/* Progress indicator */}
      {progressPercentage > 0 && (
        <div className="absolute bottom-1 left-0 right-0 flex justify-center">
          <span className="text-xs font-medium bg-white/80 text-green-800 px-1 rounded-sm">
            {progressPercentage}%
          </span>
        </div>
      )}
    </button>
  );
};

export default DayCard;
