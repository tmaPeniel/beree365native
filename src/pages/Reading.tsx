
import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import DayCard from '@/components/DayCard';
import NavBar from '@/components/NavBar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

// Mock data
const generateMockMonthData = () => {
  const days = [];
  const today = new Date();
  const month = today.getMonth();
  const year = today.getFullYear();
  
  // Get days in current month
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  
  for (let i = 1; i <= daysInMonth; i++) {
    const date = new Date(year, month, i);
    days.push({
      day: i,
      date: date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }),
      completed: Math.random() > 0.5, // Randomly mark some as completed
      chapters: [
        { id: `${i}-1`, chapter: `Genèse ${i}`, completed: Math.random() > 0.5 },
        { id: `${i}-2`, chapter: `Exode ${i}`, completed: Math.random() > 0.5 },
        { id: `${i}-3`, chapter: `Lévitique ${i}`, completed: Math.random() > 0.5 },
      ]
    });
  }
  
  return days;
};

const Reading = () => {
  const [monthData] = useState(generateMockMonthData());
  const [selectedDay, setSelectedDay] = useState<null | typeof monthData[0]>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  
  const handleDayClick = (day: typeof monthData[0]) => {
    setSelectedDay(day);
    setDialogOpen(true);
  };
  
  // Group days by weeks (assuming first day is Monday)
  const weeks = [];
  let currentWeek: typeof monthData = [];
  
  const firstDay = new Date(new Date().getFullYear(), new Date().getMonth(), 1).getDay();
  const offset = firstDay === 0 ? 6 : firstDay - 1; // Adjust for Monday as first day
  
  // Add empty days for the first week
  for (let i = 0; i < offset; i++) {
    currentWeek.push({
      day: 0,
      date: '',
      completed: false,
      chapters: []
    });
  }
  
  // Add actual days
  monthData.forEach((day, index) => {
    currentWeek.push(day);
    
    if ((index + offset + 1) % 7 === 0 || index === monthData.length - 1) {
      weeks.push([...currentWeek]);
      currentWeek = [];
    }
  });
  
  // Pad the last week if needed
  while (currentWeek.length > 0 && currentWeek.length < 7) {
    currentWeek.push({
      day: 0,
      date: '',
      completed: false,
      chapters: []
    });
  }
  
  if (currentWeek.length === 7) {
    weeks.push(currentWeek);
  }
  
  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold mb-2">Planner Lecture Bible 365</h1>
        <p className="text-gray-500">Suivez votre progression</p>
      </div>
      
      <div className="p-6">
        <Tabs defaultValue="month" className="w-full">
          <TabsList className="grid grid-cols-2 mb-6">
            <TabsTrigger value="week">Semaine</TabsTrigger>
            <TabsTrigger value="month">Mois</TabsTrigger>
          </TabsList>
          
          <TabsContent value="week" className="animate-fade-in">
            <div className="grid grid-cols-7 gap-2 mb-2">
              {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map(day => (
                <div key={day} className="text-center text-xs font-medium text-gray-500">
                  {day}
                </div>
              ))}
            </div>
            
            <div className="grid grid-cols-7 gap-2">
              {weeks[0]?.map((day, index) => (
                <div key={index}>
                  {day.day !== 0 && (
                    <DayCard
                      day={day.day}
                      date={day.date}
                      completed={day.completed}
                      onClick={() => handleDayClick(day)}
                    />
                  )}
                </div>
              ))}
            </div>
          </TabsContent>
          
          <TabsContent value="month" className="animate-fade-in">
            <div className="grid grid-cols-7 gap-2 mb-2">
              {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map(day => (
                <div key={day} className="text-center text-xs font-medium text-gray-500">
                  {day}
                </div>
              ))}
            </div>
            
            {weeks.map((week, weekIndex) => (
              <div key={weekIndex} className="grid grid-cols-7 gap-2 mb-2">
                {week.map((day, dayIndex) => (
                  <div key={dayIndex}>
                    {day.day !== 0 && (
                      <DayCard
                        day={day.day}
                        date={day.date}
                        completed={day.completed}
                        onClick={() => handleDayClick(day)}
                      />
                    )}
                  </div>
                ))}
              </div>
            ))}
          </TabsContent>
        </Tabs>
      </div>
      
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Jour {selectedDay?.day} - {selectedDay?.date}</DialogTitle>
          </DialogHeader>
          
          <div className="py-4">
            <h3 className="font-medium text-gray-700 mb-4">Chapitres du jour</h3>
            <ul className="space-y-3">
              {selectedDay?.chapters.map((item) => (
                <li key={item.id} className="flex items-center">
                  <div className={`h-5 w-5 rounded mr-3 flex items-center justify-center 
                    ${item.completed 
                      ? 'bg-beree-500 text-white' 
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
