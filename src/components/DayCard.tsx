
import React from 'react';
import OptimizedDayCard from './OptimizedDayCard';

interface DayCardProps {
  day: number;
  date: string;
  completed: boolean;
  onClick: () => void;
  isToday?: boolean;
}

/**
 * Wrapper pour maintenir la compatibilité avec l'ancien composant
 */
const DayCard: React.FC<DayCardProps> = (props) => {
  return <OptimizedDayCard {...props} />;
};

export default DayCard;
