
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
    <div className="animate-fade-in">
      <h2 className="text-2xl md:text-2xl font-bold mb-1 capitalize animate-text-reveal">
        Bienvenue {userName},
      </h2>
      <br />
      <div className="bg-gradient-to-r from-primary to-accent text-primary-foreground p-6 rounded-xl shadow-lg mb-6 hover:animate-lift transition-all duration-300 border border-primary/20">
        <h3 className="text-base md:text-base mb-1 animate-text-reveal" style={{ animationDelay: '0.1s' }}>
          Aujourd'hui c'est le
        </h3>
        <h2 className="text-xl md:text-2xl font-bold mb-1 capitalize animate-text-reveal" style={{ animationDelay: '0.2s' }}>
          JOUR {dayNumber}
        </h2>
        <p className="text-lg md:text-xl opacity-90 capitalize animate-text-reveal" style={{ animationDelay: '0.3s' }}>
          {formattedDate}
        </p>
      </div>
    </div>
  );
};

export default TodayDisplay;
