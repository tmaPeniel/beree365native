
import React, { useEffect, useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import CircularProgress from '@/components/CircularProgress';
import { useIsMobile } from '@/hooks/use-mobile';
import { useAuth } from '@/hooks/useAuth';
import { getOverallProgress } from '@/services/readingPlanService';

const ProgressStats = () => {
  const isMobile = useIsMobile();
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalPassages: 0,
    passagesRead: 0,
    passagesRemaining: 0,
    progressPercentage: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    const fetchStats = async () => {
      if (!user) return;
      
      setIsLoading(true);
      const progress = await getOverallProgress(user.id);
      setStats(progress);
      setIsLoading(false);
    };
    
    fetchStats();
  }, [user]);
  
  if (isLoading) {
    return (
      <Card className="bg-white border-none shadow-sm">
        <CardContent className="p-4 md:p-6">
          <div className="flex justify-center items-center h-48">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-green-500"></div>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card className="bg-white border-none shadow-sm">
      <CardContent className="p-4 md:p-6">
        <h2 className="text-md md:text-lg font-semibold mb-4 text-center text-blue-600 bg-blue-50 py-2 rounded-md">
          PROGRESSION GLOBALE
        </h2>
        
        <div className="w-full flex justify-center">
          <CircularProgress 
            progress={stats.progressPercentage} 
            size={isMobile ? 140 : 160}
            className="text-green-500"
          />
        </div>
        
        <div className="mt-4 md:mt-6 space-y-2 md:space-y-3">
          <div className="grid grid-cols-2 items-center bg-purple-50 p-2 md:p-3 rounded-md">
            <span className="text-sm md:text-base text-gray-700 font-medium">Total de Passages à lire</span>
            <span className="text-right font-bold text-sm md:text-base">{stats.totalPassages}</span>
          </div>
          
          <div className="grid grid-cols-2 items-center bg-orange-100 p-2 md:p-3 rounded-md">
            <span className="text-sm md:text-base text-gray-700 font-medium">Total de Passages lus</span>
            <span className="text-right font-bold text-sm md:text-base">{stats.passagesRead}</span>
          </div>
          
          <div className="grid grid-cols-2 items-center bg-gray-100 p-2 md:p-3 rounded-md border-r-2 border-green-600">
            <span className="text-sm md:text-base text-gray-700 font-medium">Total Passages restants</span>
            <span className="text-right font-bold text-sm md:text-base">{stats.passagesRemaining}</span>
          </div>
        </div>

        <div className="flex justify-center mt-3 md:mt-4">
          <div className="flex items-center space-x-3 md:space-x-4">
            <div className="flex items-center">
              <div className="w-3 h-3 bg-green-500 rounded-full mr-1"></div>
              <span className="text-xs text-gray-600">Passages Lus</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-gray-500 rounded-full mr-1"></div>
              <span className="text-xs text-gray-600">Restants</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ProgressStats;
