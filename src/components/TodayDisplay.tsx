import React from 'react';
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
  const formattedDate = date.toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
  return <div className="animate-fade-in">
      <h2 className="text-base md:text-lg font-medium text-foreground mb-3">
        Bienvenue {userName},
      </h2>
      
      <div className="mb-4">
        <p className="text-sm text-muted-foreground mb-1 text-center">Aujourd'hui c'est le</p>
        <h2 className="text-2xl md:text-3xl font-bold text-foreground text-center">
          JOUR <span className="text-primary">{dayNumber}</span>
        </h2>
        <p className="text-base text-muted-foreground capitalize mt-1 text-center">{formattedDate}</p>
      </div>
    </div>;
};
export default TodayDisplay;