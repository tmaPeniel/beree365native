import React from 'react';
import { Card, CardContent } from './card';

interface PlanDatesProps {
  startDate: Date;
  endDate: Date;
  remainingDays: number;
}

const PlanDates: React.FC<PlanDatesProps> = ({
  startDate,
  endDate,
  remainingDays,
}) => (
    <Card className="bg-white border-none shadow-sm">
      <CardContent className="p-6">
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

export default PlanDates;