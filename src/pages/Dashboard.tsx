
import React, { useState } from 'react';
import CircularProgress from '@/components/CircularProgress';
import ReadingPlan from '@/components/ReadingPlan';
import NavBar from '@/components/NavBar';

// Mock data
const mockReadingItems = [
  { id: '1', chapter: 'Genèse 1', completed: false },
  { id: '2', chapter: 'Genèse 2', completed: false },
  { id: '3', chapter: 'Genèse 3', completed: false },
];

const mockVerseOfDay = {
  text: "Car Dieu a tant aimé le monde qu'il a donné son Fils unique, afin que quiconque croit en lui ne périsse point, mais qu'il ait la vie éternelle.",
  reference: "Jean 3:16"
};

const Dashboard = () => {
  const [progress, setProgress] = useState(0);
  const [readingItems, setReadingItems] = useState(mockReadingItems);
  
  // Calculate dates
  const startDate = new Date();
  const endDate = new Date();
  endDate.setFullYear(endDate.getFullYear() + 1);
  
  // Calculate days
  const totalDays = 365;
  const currentDay = 1;
  const remainingDays = totalDays - currentDay;
  
  const handleToggleRead = (id: string) => {
    setReadingItems(prev => {
      const newItems = prev.map(item => {
        if (item.id === id) {
          return { ...item, completed: !item.completed };
        }
        return item;
      });
      
      // Update progress
      const completedCount = newItems.filter(item => item.completed).length;
      const newProgress = (completedCount / newItems.length) * 100;
      setProgress(newProgress);
      
      return newItems;
    });
  };
  
  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold mb-2">Tableau de bord</h1>
        <p className="text-gray-500">Suivez votre progression quotidienne</p>
      </div>
      
      <div className="p-6 flex flex-col items-center">
        <div className="w-full mb-6 flex justify-center">
          <CircularProgress 
            progress={progress} 
            className="text-beree-500"
          />
        </div>
        
        <ReadingPlan
          day={currentDay}
          totalDays={totalDays}
          startDate={startDate}
          endDate={endDate}
          remainingDays={remainingDays}
          verseOfDay={mockVerseOfDay}
          readingItems={readingItems}
          onToggleRead={handleToggleRead}
        />
      </div>
      
      <NavBar />
    </div>
  );
};

export default Dashboard;
