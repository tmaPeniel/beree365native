
import React, { useState } from 'react';
import NavBar from '@/components/NavBar';
import ProgressStats from '@/components/ProgressStats';
import ReadingPlan from '@/components/ReadingPlan';
import VerseOfDay from '@/components/VerseOfDay';
import { 
  getTodayReadingPlan, 
  getReadingPlanStats, 
  calculateRemainingDays,
  getPlanDates,
  ReadingItem
} from '@/utils/readingPlanUtils';
import PlanDates from '@/components/ui/PlanDate';

const Dashboard = () => {
  // Get initial data from our utilities
  const todayPlan = getTodayReadingPlan();
  const [readingItems, setReadingItems] = useState<ReadingItem[]>(todayPlan.passages);
  const [stats, setStats] = useState(getReadingPlanStats());
  
  // Get plan dates and remaining days
  const { startDate, endDate } = getPlanDates();
  const remainingDays = calculateRemainingDays();
  
  const handleToggleRead = (id: string) => {
    setReadingItems(prev => {
      const newItems = prev.map(item => {
        if (item.id === id) {
          return { ...item, completed: !item.completed };
        }
        return item;
      });
      
      // Update stats when items are completed
      const completedCount = newItems.filter(item => item.completed).length;
      
      // In a real app, this would update the stored data
      // For now, we'll just update the local stats
      if (completedCount > prev.filter(item => item.completed).length) {
        setStats(current => ({
          ...current,
          passagesRead: current.passagesRead + 1,
          passagesRemaining: current.passagesRemaining - 1,
          progressPercentage: Math.round(((current.passagesRead + 1) / current.totalPassages) * 100)
        }));
      } else {
        setStats(current => ({
          ...current,
          passagesRead: current.passagesRead - 1,
          passagesRemaining: current.passagesRemaining + 1,
          progressPercentage: Math.round(((current.passagesRead - 1) / current.totalPassages) * 100)
        }));
      }
      
      return newItems;
    });
  };
  
  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold mb-2">Le Tour de ma Bible en 365 jours</h1>
        <p className="text-gray-500">SISAP Editions Powered</p>
      </div>

      <VerseOfDay verseOfDay={todayPlan.verseOfDay} />
      
      <div className="p-6 space-y-6">
        <ProgressStats stats={stats} />

        <PlanDates
          startDate={startDate}
          endDate={endDate}
          remainingDays={remainingDays}
        />
        
        <ReadingPlan
          dayNumber={todayPlan.id}
          readingItems={readingItems}
          onToggleRead={handleToggleRead}
        />
        
      </div>
      
      <NavBar />
    </div>
  );
};

export default Dashboard;
