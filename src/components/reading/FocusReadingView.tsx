import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { BookOpen } from 'lucide-react';
import HorizontalDayCarousel from './HorizontalDayCarousel';
import FocusDayDetail from './FocusDayDetail';

interface Chapter {
  id: string;
  reference: string;
  completed: boolean;
  progressId?: string | null;
}

interface DayData {
  day: number;
  date: string;
  completed: boolean;
  progressPercentage: number;
  chapters: Chapter[];
}

interface FocusReadingViewProps {
  readingData: DayData[];
  currentDayNumber: number;
  planName?: string;
}

/**
 * Vue Focus - Affichage immersif d'un jour à la fois
 * Avec carrousel horizontal et détail du jour sélectionné
 */
const FocusReadingView = React.memo<FocusReadingViewProps>(({
  readingData,
  currentDayNumber,
  planName = "Défi Bible"
}) => {
  const [selectedDay, setSelectedDay] = useState(currentDayNumber);

  // S'assurer que le jour sélectionné est valide
  useEffect(() => {
    if (currentDayNumber && !readingData.find(d => d.day === selectedDay)) {
      setSelectedDay(currentDayNumber);
    }
  }, [currentDayNumber, readingData, selectedDay]);

  // Données du jour sélectionné
  const selectedDayData = useMemo(() => {
    return readingData.find(d => d.day === selectedDay) || readingData[0];
  }, [readingData, selectedDay]);

  // Total des jours dans le plan
  const totalDays = useMemo(() => {
    return Math.max(...readingData.map(d => d.day));
  }, [readingData]);

  // Navigation entre jours
  const handleNavigateDay = useCallback((direction: 'prev' | 'next') => {
    const currentIndex = readingData.findIndex(d => d.day === selectedDay);
    if (direction === 'prev' && currentIndex > 0) {
      setSelectedDay(readingData[currentIndex - 1].day);
    } else if (direction === 'next' && currentIndex < readingData.length - 1) {
      setSelectedDay(readingData[currentIndex + 1].day);
    }
  }, [readingData, selectedDay]);

  // Vérifier si on peut naviguer
  const currentIndex = readingData.findIndex(d => d.day === selectedDay);
  const canNavigatePrev = currentIndex > 0;
  const canNavigateNext = currentIndex < readingData.length - 1;

  // Statistiques de progression globale
  const globalProgress = useMemo(() => {
    const completedDays = readingData.filter(d => d.completed).length;
    return Math.round((completedDays / readingData.length) * 100);
  }, [readingData]);

  if (!selectedDayData) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Aucune donnée disponible</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Hero Card */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/90 to-primary p-6 text-primary-foreground">
        {/* Motif décoratif */}
        <div className="absolute top-0 right-0 w-32 h-32 opacity-20">
          <BookOpen className="w-full h-full" strokeWidth={0.5} />
        </div>
        
        <div className="relative z-10">
          <h2 className="text-2xl font-bold mb-1">{planName}</h2>
          <p className="text-primary-foreground/80 text-sm mb-4">
            Votre voyage à travers la Bible
          </p>
          
          {/* Barre de progression globale */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Progression globale</span>
              <span className="font-semibold">{globalProgress}%</span>
            </div>
            <div className="h-2 bg-primary-foreground/20 rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary-foreground rounded-full transition-all duration-500"
                style={{ width: `${globalProgress}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Carrousel des jours */}
      <div className="px-1">
        <HorizontalDayCarousel
          days={readingData}
          selectedDay={selectedDay}
          currentDayNumber={currentDayNumber}
          onDaySelect={setSelectedDay}
        />
      </div>

      {/* Détail du jour sélectionné */}
      <FocusDayDetail
        day={selectedDayData.day}
        totalDays={totalDays}
        date={selectedDayData.date}
        chapters={selectedDayData.chapters}
        progressPercentage={selectedDayData.progressPercentage}
        onNavigateDay={handleNavigateDay}
        canNavigatePrev={canNavigatePrev}
        canNavigateNext={canNavigateNext}
      />
    </div>
  );
});

FocusReadingView.displayName = 'FocusReadingView';

export default FocusReadingView;
