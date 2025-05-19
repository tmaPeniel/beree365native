
import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { VerseOfDay as VerseOfDayType } from '@/utils/readingPlanUtils';

interface VerseOfDayProps {
  verseOfDay: VerseOfDayType;
}

const VerseOfDay: React.FC<VerseOfDayProps> = ({ verseOfDay }) => {
  return (
    <Card className="bg-white border-none shadow-sm">
      <CardContent className="p-6">
        <h2 className="text-lg font-semibold mb-3">Verset du jour</h2>
        <div className="bg-green-50 p-4 rounded-lg border border-green-100">
          <p className="text-gray-700 italic mb-2">"{verseOfDay.text}"</p>
          <p className="text-right text-sm text-gray-500">{verseOfDay.reference}</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default VerseOfDay;
