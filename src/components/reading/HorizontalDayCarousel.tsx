import React, { useRef, useEffect, useMemo } from 'react';
import { Check } from 'lucide-react';
interface DayData {
  day: number;
  date: string;
  completed: boolean;
  progressPercentage: number;
}
interface HorizontalDayCarouselProps {
  days: DayData[];
  selectedDay: number;
  currentDayNumber: number;
  onDaySelect: (day: number) => void;
}

/**
 * Carrousel horizontal des jours avec scroll tactile
 * Auto-scroll vers le jour courant au chargement
 */
const HorizontalDayCarousel = React.memo<HorizontalDayCarouselProps>(({
  days,
  selectedDay,
  currentDayNumber,
  onDaySelect
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const selectedDayRef = useRef<HTMLButtonElement>(null);

  // Auto-scroll vers le jour sélectionné au montage
  useEffect(() => {
    if (selectedDayRef.current && scrollRef.current) {
      const container = scrollRef.current;
      const element = selectedDayRef.current;
      const containerWidth = container.offsetWidth;
      const elementLeft = element.offsetLeft;
      const elementWidth = element.offsetWidth;

      // Centrer l'élément dans le conteneur
      const scrollPosition = elementLeft - containerWidth / 2 + elementWidth / 2;
      container.scrollTo({
        left: Math.max(0, scrollPosition),
        behavior: 'smooth'
      });
    }
  }, [selectedDay]);

  // Formater la date pour l'affichage
  const formatDayDate = useMemo(() => (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short'
    }).replace('.', '');
  }, []);
  return <div ref={scrollRef} className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide scroll-smooth" style={{
    scrollbarWidth: 'none',
    msOverflowStyle: 'none'
  }}>
      {days.map(dayData => {
      const isSelected = dayData.day === selectedDay;
      const isCurrentDay = dayData.day === currentDayNumber;
      return <button key={dayData.day} ref={isSelected ? selectedDayRef : null} onClick={() => onDaySelect(dayData.day)} className={`flex-shrink-0 flex flex-col items-center justify-center min-w-[70px] h-[70px] rounded-xl transition-all ${isSelected ? 'bg-foreground text-background shadow-lg scale-105' : isCurrentDay ? 'bg-primary/20 border-2 border-primary text-foreground' : 'bg-muted text-foreground hover:bg-muted/80'}`}>
            {/* Indicateur de complétion */}
            {dayData.completed}
            
            {/* Numéro du jour */}
            <span className={`text-lg font-bold ${isSelected ? 'text-background' : ''}`}>
              {dayData.day}
            </span>
            
            {/* Date formatée */}
            <span className={`text-xs ${isSelected ? 'text-background/80' : 'text-muted-foreground'}`}>
              {formatDayDate(dayData.date)}
            </span>
          </button>;
    })}
    </div>;
});
HorizontalDayCarousel.displayName = 'HorizontalDayCarousel';
export default HorizontalDayCarousel;