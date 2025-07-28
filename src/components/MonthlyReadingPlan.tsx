import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import ExpandedDayCard from './ExpandedDayCard';

interface MonthlyReadingPlanProps {
  readingData: Array<{
    day: number;
    date: string;
    chapters: any[];
    progressPercentage: number;
  }>;
  currentDayNumber: number;
  currentDayRef: React.RefObject<HTMLDivElement>;
  isMobile: boolean;
}

interface MonthData {
  monthName: string;
  monthNumber: number;
  year: number;
  days: Array<{
    day: number;
    date: string;
    chapters: any[];
    progressPercentage: number;
  }>;
}

const MonthlyReadingPlan: React.FC<MonthlyReadingPlanProps> = ({
  readingData,
  currentDayNumber,
  currentDayRef,
  isMobile
}) => {
  // Organiser les données par mois
  const monthlyData = useMemo(() => {
    const months: MonthData[] = [];
    
    // Grouper par mois
    const monthGroups = readingData.reduce((acc, dayData) => {
      const date = new Date(dayData.date);
      const monthKey = `${date.getFullYear()}-${date.getMonth()}`;
      
      if (!acc[monthKey]) {
        acc[monthKey] = {
          monthName: date.toLocaleDateString('fr-FR', { month: 'long' }),
          monthNumber: date.getMonth(),
          year: date.getFullYear(),
          days: []
        };
      }
      
      acc[monthKey].days.push(dayData);
      return acc;
    }, {} as Record<string, any>);

    // Convertir en tableau et trier par date
    return Object.values(monthGroups).map((month: any) => ({
      ...month,
      days: month.days.sort((a: any, b: any) => a.day - b.day)
    })).sort((a: any, b: any) => {
      if (a.year !== b.year) return a.year - b.year;
      return a.monthNumber - b.monthNumber;
    });
  }, [readingData]);

  // Trouver le mois contenant le jour courant
  const currentMonthIndex = useMemo(() => {
    const index = monthlyData.findIndex(month => 
      month.days.some(day => day.day === currentDayNumber)
    );
    return index !== -1 ? index : 0;
  }, [monthlyData, currentDayNumber]);

  const [currentPage, setCurrentPage] = useState(currentMonthIndex);

  // Synchroniser avec le mois courant quand il change
  React.useEffect(() => {
    setCurrentPage(currentMonthIndex);
  }, [currentMonthIndex]);

  const currentMonth = monthlyData[currentPage];

  const goToPreviousMonth = () => {
    setCurrentPage(prev => Math.max(0, prev - 1));
  };

  const goToNextMonth = () => {
    setCurrentPage(prev => Math.min(monthlyData.length - 1, prev + 1));
  };

  const goToCurrentMonth = () => {
    setCurrentPage(currentMonthIndex);
  };

  if (!currentMonth) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Aucune donnée disponible</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Navigation entre les mois */}
      <div className="flex items-center justify-between bg-white p-4 rounded-lg shadow-sm">
        <Button
          variant="outline"
          size="sm"
          onClick={goToPreviousMonth}
          disabled={currentPage === 0}
          className="flex items-center gap-2"
        >
          <ChevronLeft className="h-4 w-4" />
          Précédent
        </Button>

        <div className="text-center">
          <h2 className="text-lg font-semibold text-gray-800 capitalize">
            {currentMonth.monthName} {currentMonth.year}
          </h2>
          {currentPage !== currentMonthIndex && (
            <Button
              variant="link"
              size="sm"
              onClick={goToCurrentMonth}
              className="text-green-600 p-0 h-auto"
            >
              Aller au mois courant
            </Button>
          )}
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={goToNextMonth}
          disabled={currentPage === monthlyData.length - 1}
          className="flex items-center gap-2"
        >
          Suivant
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Affichage du mois courant */}
      <Card className="bg-white shadow-sm">
        
        <CardContent className="p-4 md:p-6">
          {/* Grille des jours du mois */}
          <div className={`grid gap-3 md:gap-4 ${
            isMobile 
              ? 'grid-cols-2' 
              : 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5'
          }`}>
            {currentMonth.days.map((dayData) => (
              <div
                key={dayData.day}
                ref={dayData.day === currentDayNumber ? currentDayRef : null}
                className="transition-all duration-300"
              >
                <ExpandedDayCard
                  day={dayData.day}
                  date={dayData.date}
                  isToday={dayData.day === currentDayNumber}
                  chapters={dayData.chapters}
                  progressPercentage={dayData.progressPercentage}
                  isMobile={isMobile}
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default MonthlyReadingPlan;