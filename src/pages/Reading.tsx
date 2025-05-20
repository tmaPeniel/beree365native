
import React, { useState, useEffect } from 'react';
import DayCard from '@/components/DayCard';
import NavBar from '@/components/NavBar';
import { useIsMobile } from '@/hooks/use-mobile';
import { useAuth } from '@/hooks/useAuth';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { getUserProgressForDay, getReadingPlanForDay, toggleChapterStatus } from '@/services/readingPlanService';
import { Check } from 'lucide-react';

const Reading = () => {
  const isMobile = useIsMobile();
  const { profile, user } = useAuth();
  const [yearData, setYearData] = useState<any[]>([]);
  const [selectedDay, setSelectedDay] = useState<null | any>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  // Generate days for the entire year based on user's start date
  useEffect(() => {
    const generateYearData = async () => {
      if (!profile || !user) return;
      
      setIsLoading(true);
      const days = [];
      const planStartDate = new Date(profile.start_date);
      const today = new Date();
      
      // Generate 365 days starting from plan start date
      for (let i = 0; i < 365; i++) {
        const currentDate = new Date(planStartDate);
        currentDate.setDate(planStartDate.getDate() + i);
        
        // Check if this date is today
        const isToday = currentDate.toDateString() === today.toDateString();
        
        // We'll set progress percentage to 0 initially and update it later for days we've fetched
        days.push({
          day: i + 1,
          date: currentDate,
          completed: currentDate < today, // Mark as completed if date is in the past
          isToday: isToday,
          progressPercentage: 0,
          chapters: [] // We'll populate this when the day is clicked
        });
      }
      
      setYearData(days);
      setIsLoading(false);
    };
    
    generateYearData();
  }, [profile, user]);

  const handleDayClick = async (day: any) => {
    if (!user) return;
    
    setSelectedDay(day);
    
    // Fetch chapters for this day
    const chaptersData = await getReadingPlanForDay(day.day);
    const progressData = await getUserProgressForDay(user.id, day.day);
    
    // Create an array of chapters with completed status
    const chapters = chaptersData.map(chapter => {
      const progressItem = progressData.find(p => p.chapter_id === chapter.id);
      return {
        id: chapter.id,
        chapter: chapter.reference,
        completed: progressItem ? progressItem.status === 'completed' : false
      };
    });
    
    // Update the selected day with fetched chapters
    setSelectedDay(prev => ({
      ...prev,
      chapters
    }));
    
    setDialogOpen(true);
  };

  const handleToggleChapter = async (chapterId: string, completed: boolean) => {
    if (!user || !selectedDay) return;
    
    // Update in Supabase
    const result = await toggleChapterStatus(user.id, chapterId, completed ? 'completed' : 'pending');
    
    if (result.success) {
      // Update local state
      setSelectedDay(prev => ({
        ...prev,
        chapters: prev.chapters.map((chapter: any) => 
          chapter.id === chapterId 
            ? { ...chapter, completed: !chapter.completed } 
            : chapter
        )
      }));
    }
  };

  // Group days into rows (approximately 30 days per row)
  const rows = [];
  let currentRow: any[] = [];
  
  // Define number of columns based on screen size
  const columnsPerRow = isMobile ? 5 : 7;
  
  yearData.forEach((day, index) => {
    currentRow.push(day);
    
    if ((index + 1) % columnsPerRow === 0 || index === yearData.length - 1) {
      rows.push([...currentRow]);
      currentRow = [];
    }
  });
  
  // Scroll to today's date when the component mounts
  useEffect(() => {
    const todayElement = document.getElementById('today');
    if (todayElement) {
      todayElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [yearData]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 pb-20">
        <div className="bg-white p-4 md:p-6 shadow-sm">
          <h1 className="text-xl md:text-2xl font-bold mb-1 md:mb-2">Planner Lecture Bible 365</h1>
          <p className="text-sm md:text-base text-gray-500">Suivez votre progression sur toute l'année</p>
        </div>
        
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
        </div>

        <NavBar />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="bg-white p-4 md:p-6 shadow-sm">
        <h1 className="text-xl md:text-2xl font-bold mb-1 md:mb-2">Planner Lecture Bible 365</h1>
        <p className="text-sm md:text-base text-gray-500">Suivez votre progression sur toute l'année</p>
      </div>
      
      <div className="p-4 md:p-6">
        <div className="space-y-4 md:space-y-6">
          {rows.map((row, rowIndex) => (
            <div key={rowIndex} className={`grid grid-cols-${columnsPerRow} gap-2 mb-2`}>
              {row.map((day, dayIndex) => (
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
            <DialogDescription>
              Votre lecture biblique du jour
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <h3 className="font-medium text-gray-700 mb-4">Chapitres du jour</h3>
            {selectedDay?.chapters?.length > 0 ? (
              <ul className="space-y-3">
                {selectedDay.chapters.map((item: any) => (
                  <li key={item.id} className="flex items-center">
                    <button 
                      className="flex items-center w-full text-left"
                      onClick={() => handleToggleChapter(item.id, item.completed)}
                    >
                      <div className={`h-5 w-5 rounded mr-3 flex items-center justify-center 
                        ${item.completed 
                          ? 'bg-green-500 text-white' 
                          : 'bg-gray-200 text-gray-400 border-2 border-gray-300'
                        }`}>
                        {item.completed && <Check className="h-3 w-3" />}
                      </div>
                      <span className={`${item.completed ? 'text-gray-400 line-through' : 'text-gray-800'}`}>
                        {item.chapter}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-center text-gray-500">
                Aucun chapitre trouvé pour ce jour
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
      
      <NavBar />
    </div>
  );
};

export default Reading;
