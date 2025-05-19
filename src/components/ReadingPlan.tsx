
import React, { useState } from 'react';

// Simple mock data for reading plan
interface ReadingItem {
  id: string;
  chapter: string;
  completed: boolean;
}

interface ReadingPlanProps {
  day: number;
  totalDays: number;
  startDate: Date;
  endDate: Date;
  remainingDays: number;
  verseOfDay: {
    text: string;
    reference: string;
  };
  readingItems: ReadingItem[];
  onToggleRead: (id: string) => void;
}

const ReadingPlan: React.FC<ReadingPlanProps> = ({
  day,
  totalDays,
  startDate,
  endDate,
  remainingDays,
  verseOfDay,
  readingItems,
  onToggleRead
}) => {
  return (
    <div className="card-reading animate-fade-in">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-semibold">Aujourd'hui</h2>
        <span className="text-sm bg-beree-100 text-beree-700 py-1 px-2 rounded-full">
          Jour {day}/{totalDays}
        </span>
      </div>
      
      <div className="mb-6">
        <h3 className="font-medium text-gray-700 mb-2">Chapitres du jour</h3>
        <ul className="space-y-2">
          {readingItems.map((item) => (
            <li key={item.id} className="flex items-center">
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={item.completed}
                  onChange={() => onToggleRead(item.id)}
                  className="peer sr-only"
                />
                <div className="h-5 w-5 border-2 border-beree-300 rounded mr-3 flex items-center justify-center transition-colors peer-checked:bg-beree-500 peer-checked:border-beree-500">
                  {item.completed && (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-3 w-3 text-white"
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
                <span className={`${item.completed ? 'line-through text-gray-400' : 'text-gray-800'}`}>
                  {item.chapter}
                </span>
              </label>
            </li>
          ))}
        </ul>
      </div>
      
      <div className="bg-beree-50 rounded-lg p-4 mb-4">
        <h3 className="font-medium text-beree-700 mb-2 text-sm">Verset du jour</h3>
        <p className="text-gray-700 italic mb-2">"{verseOfDay.text}"</p>
        <p className="text-right text-sm text-beree-600">{verseOfDay.reference}</p>
      </div>
      
      <div className="text-sm text-gray-500 grid grid-cols-2 gap-2">
        <div>
          <p className="mb-1">Date de début</p>
          <p className="font-medium text-gray-700">{startDate.toLocaleDateString()}</p>
        </div>
        <div>
          <p className="mb-1">Date de fin</p>
          <p className="font-medium text-gray-700">{endDate.toLocaleDateString()}</p>
        </div>
        <div className="col-span-2 mt-2">
          <p className="mb-1">Jours restants</p>
          <p className="font-medium text-gray-700">{remainingDays} jours</p>
        </div>
      </div>
    </div>
  );
};

export default ReadingPlan;
