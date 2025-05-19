
import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import CircularProgress from '@/components/CircularProgress';
import { ReadingPlanStats } from '@/utils/readingPlanUtils';

interface ProgressStatsProps {
  stats: ReadingPlanStats;
}

const ProgressStats: React.FC<ProgressStatsProps> = ({ stats }) => {
  return (
    <Card className="bg-white border-none shadow-sm">
      <CardContent className="p-6">
        <h2 className="text-lg font-semibold mb-4 text-center text-blue-600 bg-blue-50 py-2 rounded-md">
          PROGRESSION GLOBALE
        </h2>
        
        <div className="w-full flex justify-center">
          <CircularProgress 
            progress={stats.progressPercentage} 
            className="text-green-500"
          />
        </div>
        
        <div className="mt-6 space-y-3">
          <div className="grid grid-cols-2 items-center bg-purple-50 p-3 rounded-md">
            <span className="text-gray-700 font-medium">Total de Passages à lire</span>
            <span className="text-right font-bold">{stats.totalPassages}</span>
          </div>
          
          <div className="grid grid-cols-2 items-center bg-orange-100 p-3 rounded-md">
            <span className="text-gray-700 font-medium">Total de Passages lus</span>
            <span className="text-right font-bold">{stats.passagesRead}</span>
          </div>
          
          <div className="grid grid-cols-2 items-center bg-gray-100 p-3 rounded-md border-r-2 border-green-600">
            <span className="text-gray-700 font-medium">Total Passages restants</span>
            <span className="text-right font-bold">{stats.passagesRemaining}</span>
          </div>
        </div>

        <div className="flex justify-center mt-4">
          <div className="flex items-center space-x-4">
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
