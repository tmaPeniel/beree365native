
import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { ReadingItem, VerseOfDay } from '@/utils/readingPlanUtils';
import { Check } from 'lucide-react';

interface ReadingPlanProps {
  dayNumber: number;
  readingItems: ReadingItem[];
  onToggleRead: (id: string) => void;
  startDate: Date;
  endDate: Date;
  remainingDays: number;
}

const ReadingPlan: React.FC<ReadingPlanProps> = ({
  dayNumber,
  readingItems,
  onToggleRead,
  startDate,
  endDate,
  remainingDays,
}) => {
  return (
    <Card className="bg-white border-none shadow-sm">
      <CardContent className="p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Aujourd'hui</h2>
          <span className="text-sm bg-green-100 text-green-700 py-1 px-3 rounded-full">
            Jour {dayNumber}/365
          </span>
        </div>
        
        <div className="mb-6">
          <h3 className="font-medium text-gray-700 mb-3">Passages du jour</h3>
          <ul className="space-y-3">
            {readingItems.map((item) => (
              <li key={item.id} className="flex items-center">
                <button
                  onClick={() => onToggleRead(item.id)}
                  className={`flex items-center w-full text-left ${
                    item.completed ? 'text-gray-400' : 'text-gray-800'
                  }`}
                >
                  <div className={`h-5 w-5 rounded mr-3 flex items-center justify-center transition-colors ${
                    item.completed ? 'bg-green-500' : 'border-2 border-green-300'
                  }`}>
                    {item.completed && <Check className="h-3 w-3 text-white" />}
                  </div>
                  <span className={item.completed ? 'line-through' : ''}>
                    {item.reference}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
        
        <div className="text-sm text-gray-500 grid grid-cols-2 gap-3 mt-6">
          <div className="bg-blue-50 p-3 rounded">
            <p className="mb-1 text-blue-700">Date de début</p>
            <p className="font-medium text-gray-700">{startDate.toLocaleDateString()}</p>
          </div>
          <div className="bg-blue-50 p-3 rounded">
            <p className="mb-1 text-blue-700">Date de fin</p>
            <p className="font-medium text-gray-700">{endDate.toLocaleDateString()}</p>
          </div>
          <div className="col-span-2 bg-green-50 p-3 rounded">
            <p className="mb-1 text-green-700">Jours restants</p>
            <p className="font-medium text-gray-700">{remainingDays} jours</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ReadingPlan;
