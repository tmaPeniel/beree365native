
import React from 'react';
import DayNavigationControls from './DayNavigationControls';

interface TodayDisplayProps {
  dayNumber: number;
  date: Date;
  userName: string;
}

const TodayDisplay: React.FC<TodayDisplayProps> = ({
  dayNumber,
  date,
  userName
}) => {
  console.log(`🏷️ TodayDisplay - Jour reçu: ${dayNumber}`);

  const formattedDate = date.toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  return (
    <div className="animate-slide-up">
      <h2 className="text-2xl md:text-2xl font-bold mb-1 capitalize animate-fade-in">
        Bienvenue {userName},
      </h2>
      <br />
      <div className="bg-gradient-to-r from-green-500 to-green-600 text-white p-6 rounded-xl shadow-md mb-6 animate-scale-in hover:scale-105 transition-transform duration-300">
        <h3 className="text-base md:text-base mb-1 animate-slide-down" style={{ animationDelay: '0.2s' }}>
          Aujourd'hui c'est le
        </h3>
        <h2 className="text-xl md:text-2xl font-bold mb-1 capitalize animate-tada" style={{ animationDelay: '0.4s' }}>
          JOUR {dayNumber}
        </h2>
        <p className="text-lg md:text-xl opacity-90 capitalize animate-fade-in" style={{ animationDelay: '0.6s' }}>
          {formattedDate}
        </p>
      </div>
    </div>
  );
};

export default TodayDisplay;
