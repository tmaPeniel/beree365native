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
  // Debug du jour reçu
  console.log(`🏷️ TodayDisplay - Jour reçu: ${dayNumber}`);

  // Format the date: "Mardi, 20 Mai 2025"
  const formattedDate = date.toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
  return <div>
      <h2 className="text-2xl md:text-2xl font-bold mb-1 capitalize">
          Bienvenue {userName},
      </h2>
    <br />
    <div className="bg-gradient-to-r from-green-500 to-green-600 text-white p-6 rounded-xl shadow-md mb-6">
      <h3 className="text-base md:text-base mb-1">
        Aujourd'hui c'est le
      </h3>
      <h2 className="text-xl md:text-2xl font-bold mb-1 capitalize">
        JOUR {dayNumber}
      </h2>
      <p className="text-lg md:text-xl opacity-90 capitalize">{formattedDate}</p>
      
      {/* Contrôles de navigation */}
      
    </div>

    </div>;
};
export default TodayDisplay;