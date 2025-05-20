
import React from 'react';

interface DayCardProps {
  day: number;
  date: string;
  completed: boolean;
  onClick: () => void;
  isToday?: boolean; // New prop to highlight the current day
}

const DayCard: React.FC<DayCardProps> = ({ day, date, completed, onClick, isToday = false }) => {
  const formattedDate = new Date(date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  
  return (
    <button 
      onClick={onClick}
      className={`w-full aspect-square rounded-lg flex flex-col items-center justify-center p-2 transition-all 
        ${isToday 
          ? 'bg-green-600 text-white shadow-lg border-2 border-green-700' 
          : completed 
            ? 'bg-green-400 text-white shadow-md hover:bg-green-600' 
            : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
        }`}
    >
      <span className="text-sm font-semibold">Jour {day}</span>
      <span className="text-xs">{formattedDate}</span>
    </button>
  );
};

export default DayCard;
