
import React, { useState } from 'react';
import CircularProgress from '@/components/CircularProgress';
import ReadingPlan from '@/components/ReadingPlan';
import NavBar from '@/components/NavBar';
import { Card, CardContent } from "@/components/ui/card";
import { PieChart } from "lucide-react";

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

// Mock statistics for the Bible reading plan
const mockStats = {
  totalPassages: 1133,
  passagesRead: 409,
  passagesRemaining: 724
};

const Dashboard = () => {
  const [progress, setProgress] = useState(36); // Updated to 36% (409/1133)
  const [readingItems, setReadingItems] = useState(mockReadingItems);
  
  // Calculate dates
  const startDate = new Date();
  const endDate = new Date();
  endDate.setFullYear(endDate.getFullYear() + 1);
  
  // Calculate days
  const totalDays = 365;
  const currentDay = 55; // Example: day 55 of 365
  const remainingDays = totalDays - currentDay;
  
  const handleToggleRead = (id: string) => {
    setReadingItems(prev => {
      const newItems = prev.map(item => {
        if (item.id === id) {
          return { ...item, completed: !item.completed };
        }
        return item;
      });
      
      // Calculate daily progress for the items
      const completedCount = newItems.filter(item => item.completed).length;
      const dailyProgress = (completedCount / newItems.length) * 100;
      
      // For this example, we'll update total progress slightly when items are completed
      // In a real app, this would need to calculate based on all chapters in the plan
      if (dailyProgress === 100 && progress < 100) {
        // Increment total progress by a small amount when all daily items are completed
        setProgress(Math.min(progress + (100 / totalDays), 100));
      }
      
      return newItems;
    });
  };
  
  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold mb-2">Tableau de bord</h1>
        <p className="text-gray-500">Suivez votre progression quotidienne</p>
      </div>
      
      <div className="p-6 space-y-6">
        {/* Progress Statistics */}
        <Card className="bg-white border-none shadow-sm">
          <CardContent className="p-6">
            <h2 className="text-lg font-semibold mb-4 text-center text-blue-600 bg-blue-50 py-2 rounded-md">PROGRESSION GLOBALE</h2>
            
            <div className="w-full flex justify-center">
              <CircularProgress 
                progress={progress} 
                className="text-green-500"
              />
            </div>
            
            <div className="mt-6 space-y-3">
              <div className="grid grid-cols-2 items-center bg-purple-50 p-3 rounded-md">
                <span className="text-gray-700 font-medium">Total de Passages à lire</span>
                <span className="text-right font-bold">{mockStats.totalPassages}</span>
              </div>
              
              <div className="grid grid-cols-2 items-center bg-orange-100 p-3 rounded-md">
                <span className="text-gray-700 font-medium">Total de Passages lus</span>
                <span className="text-right font-bold">{mockStats.passagesRead}</span>
              </div>
              
              <div className="grid grid-cols-2 items-center bg-gray-100 p-3 rounded-md border-r-2 border-green-600">
                <span className="text-gray-700 font-medium">Total Passages restants</span>
                <span className="text-right font-bold">{mockStats.passagesRemaining}</span>
              </div>
            </div>

            <div className="flex justify-center mt-4">
              <div className="flex items-center space-x-4">
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-green-500 rounded-full mr-1"></div>
                  <span className="text-xs text-gray-600">Passages Lus</span>
                </div>
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-red-500 rounded-full mr-1"></div>
                  <span className="text-xs text-gray-600">Restants</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <ReadingPlan
          day={currentDay}
          totalDays={totalDays}
          startDate={startDate}
          endDate={endDate}
          remainingDays={remainingDays}
          readingItems={readingItems}
          onToggleRead={handleToggleRead}
          verseOfDay={mockVerseOfDay}
        />
        
        <Card className="bg-white border-none shadow-sm">
          <CardContent className="p-6">
            <h2 className="text-lg font-semibold mb-3">Verset du jour</h2>
            <div className="bg-green-50 p-4 rounded-lg border border-green-100">
              <p className="text-gray-700 italic mb-2">{mockVerseOfDay.text}</p>
              <p className="text-right text-sm text-gray-500">{mockVerseOfDay.reference}</p>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <NavBar />
    </div>
  );
};

export default Dashboard;
