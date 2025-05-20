
import React, { useState, useEffect } from 'react';
import DayCard from '@/components/DayCard';
import NavBar from '@/components/NavBar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { getPlanDates } from '@/utils/readingPlanUtils';

const Reading = () => {
  // Fetch plan start date from utils
  const { startDate } = getPlanDates();

  // Generate days for the entire year starting from plan start date
  const generateYearData = () => {
    const days = [];
    const planStartDate = new Date(startDate);
    const today = new Date();
    
    // Generate 365 days starting from plan start date
    for (let i = 0; i < 365; i++) {
      const currentDate = new Date(planStartDate);
      currentDate.setDate(planStartDate.getDate() + i);
      
      // Check if this date is today
      const isToday = currentDate.toDateString() === today.toDateString();
      
      days.push({
        day: i + 1,
        date: currentDate,
        completed: currentDate < today, // Mark as completed if date is in the past
        isToday: isToday,
        chapters: [
          { id: `${i}-1`, chapter: `Genèse ${i+1}`, completed: currentDate < today },
          { id: `${i}-2`, chapter: `Exode ${i+1}`, completed: currentDate < today },
          { id: `${i}-3`, chapter: `Lévitique ${i+1}`, completed: currentDate < today },
        ]
      });
    }
    
    return days;
  };

  const [yearData, setYearData] = useState(generateYearData());
  const [selectedDay, setSelectedDay] = useState<null | any>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  
  const handleDayClick = (day: any) => {
    setSelectedDay(day);
    setDialogOpen(true);
  };

  // Group days into months (approximately 30 days per row)
  const months = [];
  let currentMonth: any[] = [];
  
  yearData.forEach((day, index) => {
    currentMonth.push(day);
    
    if ((index + 1) % 30 === 0 || index === yearData.length - 1) {
      months.push([...currentMonth]);
      currentMonth = [];
    }
  });
  
  // Scroll to today's date when the component mounts
  useEffect(() => {
    const todayElement = document.getElementById('today');
    if (todayElement) {
      todayElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold mb-2">Planner Lecture Bible 365</h1>
        <p className="text-gray-500">Suivez votre progression sur toute l'année</p>
      </div>
      
      <div className="p-6">
        <div className="space-y-6">
          {months.map((month, monthIndex) => (
            <div key={monthIndex} className="grid grid-cols-7 gap-2 mb-2">
              {month.map((day, dayIndex) => (
                <div key={dayIndex} id={day.isToday ? 'today' : undefined}>
                  <DayCard
                    day={day.day}
                    date={day.date.toISOString()}
                    completed={day.completed}
                    isToday={day.isToday}
                    onClick={() => handleDayClick(day)}
                  />
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
      
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              Jour {selectedDay?.day} - {selectedDay?.date ? new Date(selectedDay.date).toLocaleDateString('fr-FR') : ''}
            </DialogTitle>
          </DialogHeader>
          
          <div className="py-4">
            <h3 className="font-medium text-gray-700 mb-4">Chapitres du jour</h3>
            <ul className="space-y-3">
              {selectedDay?.chapters.map((item: any) => (
                <li key={item.id} className="flex items-center">
                  <div className={`h-5 w-5 rounded mr-3 flex items-center justify-center 
                    ${item.completed 
                      ? 'bg-green-500 text-white' 
                      : 'bg-gray-200 text-gray-400'
                    }`}>
                    {item.completed && (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-3 w-3"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    )}
                  </div>
                  <span className={`${item.completed ? 'text-gray-400' : 'text-gray-800'}`}>
                    {item.chapter}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </DialogContent>
      </Dialog>
      
      <NavBar />
    </div>
  );
};

export default Reading;
