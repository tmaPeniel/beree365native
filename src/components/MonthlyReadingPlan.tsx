import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import ExpandedDayCard from './ExpandedDayCard';
import { formatDateToFrench } from '@/services/dateService';

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

interface WeekData {
  weekNumber: number;
  startDate: string;
  endDate: string;
  days: Array<{
    day: number;
    date: string;
    chapters: any[];
    progressPercentage: number;
  }>;
}

interface MonthData {
  monthName: string;
  monthNumber: number;
  year: number;
  weeks: WeekData[];
}

const MonthlyReadingPlan: React.FC<MonthlyReadingPlanProps> = ({
  readingData,
  currentDayNumber,
  currentDayRef,
  isMobile
}) => {
  // Organiser les données par mois et semaines
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

    // Organiser chaque mois en semaines
    Object.values(monthGroups).forEach((month: any) => {
      const weeks: WeekData[] = [];
      let currentWeek: any[] = [];
      let weekNumber = 1;

      month.days.forEach((day: any, index: number) => {
        currentWeek.push(day);

        // Nouvelle semaine tous les 7 jours ou à la fin du mois
        if (currentWeek.length === 7 || index === month.days.length - 1) {
          const startDate = currentWeek[0].date;
          const endDate = currentWeek[currentWeek.length - 1].date;

          weeks.push({
            weekNumber,
            startDate,
            endDate,
            days: [...currentWeek]
          });

          currentWeek = [];
          weekNumber++;
        }
      });

      months.push({
        ...month,
        weeks
      });
    });

    return months;
  }, [readingData]);

  const formatWeekRange = (startDate: string, endDate: string) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    return `Du ${start.getDate().toString().padStart(2, '0')}/${(start.getMonth() + 1).toString().padStart(2, '0')} au ${end.getDate().toString().padStart(2, '0')}/${(end.getMonth() + 1).toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-8">
      {monthlyData.map((month) => (
        <Card key={`${month.year}-${month.monthNumber}`} className="bg-white shadow-sm">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
            <CardTitle className="text-xl md:text-2xl font-bold text-blue-800 capitalize text-center">
              {month.monthName} {month.year}
            </CardTitle>
          </CardHeader>
          
          <CardContent className="p-4 md:p-6">
            <div className="space-y-6">
              {month.weeks.map((week) => (
                <div key={week.weekNumber} className="space-y-3">
                  {/* En-tête de semaine */}
                  <div className="flex items-center justify-center">
                    <div className="bg-green-50 px-4 py-2 rounded-lg border border-green-200">
                      <h3 className="text-sm md:text-base font-medium text-green-700 text-center">
                        Semaine {formatWeekRange(week.startDate, week.endDate)}
                      </h3>
                    </div>
                  </div>
                  
                  {/* Cartes des jours de la semaine */}
                  <div className={`grid gap-3 ${
                    isMobile 
                      ? 'grid-cols-2' 
                      : week.days.length <= 3 
                        ? 'grid-cols-1 md:grid-cols-3' 
                        : week.days.length <= 5
                          ? 'grid-cols-1 md:grid-cols-5'
                          : 'grid-cols-2 md:grid-cols-4 lg:grid-cols-7'
                  }`}>
                    {week.days.map((dayData) => (
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
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default MonthlyReadingPlan;