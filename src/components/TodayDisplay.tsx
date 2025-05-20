
import React from 'react';

interface TodayDisplayProps {
  dayNumber: number;
  date: Date;
}

const TodayDisplay: React.FC<TodayDisplayProps> = ({ dayNumber, date }) => {
  // Format the date: "Mardi, 20 Mai 2025"
  const formattedDate = date.toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
  
  return (
    <div className="bg-gradient-to-r from-green-500 to-green-600 text-white p-6 rounded-xl shadow-md mb-6">
      <h2 className="text-xl md:text-2xl font-bold mb-1 capitalize">
        Aujourd'hui c'est le Jour {dayNumber}
      </h2>
      <p className="text-lg md:text-xl opacity-90 capitalize">{formattedDate}</p>
    </div>
  );
};

export default TodayDisplay;
