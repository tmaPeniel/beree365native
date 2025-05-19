
import React from 'react';

interface DayCardProps {
  day: number;
  date: string;
  completed: boolean;
  onClick: () => void;
}

const DayCard: React.FC<DayCardProps> = ({ day, date, completed, onClick }) => {
  return (
    <button 
      onClick={onClick}
      className={`w-full aspect-square rounded-lg flex flex-col items-center justify-center p-2 transition-all 
        ${completed 
          ? 'bg-beree-500 text-white shadow-md hover:bg-beree-600' 
          : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
        }`}
    >
      <span className="text-lg font-semibold">{day}</span>
      <span className="text-xs">{date}</span>
    </button>
  );
};

export default DayCard;
