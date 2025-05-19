
import React from 'react';

interface DayCardProps {
  day: number;
  date: string;
  completed: boolean;
  onClick: () => void;
}

const DayCard: React.FC<DayCardProps> = ({ day, date, completed, onClick }) => {
  const formattedDate = new Date(date).toLocaleDateString('fr-FR');
  return (
    <button 
      onClick={onClick}
      className={`w-full aspect-square rounded-lg flex flex-col items-center justify-center p-2 transition-all 
        ${completed 
          ? 'bg-green-400 text-white shadow-md hover:bg-green-600' 
          : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
        }`}
    >
      <span className="text-lg font-semibold">Jour {day}</span>
      <span className="text-xs">{formattedDate}</span>
    </button>
  );
};

export default DayCard;
