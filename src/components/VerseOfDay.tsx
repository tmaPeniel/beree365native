import React, { useEffect, useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { getDailyVerse } from '@/services/readingPlan';
import { DailyVerse } from "@/types/supabase";

interface VerseOfDayProps {
  dayNumber: number;
}

const VerseOfDay: React.FC<VerseOfDayProps> = ({ dayNumber }) => {
  const [verseOfDay, setVerseOfDay] = useState<DailyVerse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchVerse = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        console.log(`VerseOfDay component: fetching verse for day ${dayNumber}`);
        
        if (!dayNumber || dayNumber < 1) {
          console.warn(`VerseOfDay: Invalid day number: ${dayNumber}`);
          setError(`Jour invalide: ${dayNumber}`);
          setIsLoading(false);
          return;
        }
        
        const verse = await getDailyVerse(dayNumber);
        setVerseOfDay(verse);
      } catch (err) {
        console.error('Error fetching verse of day:', err);
        setError('Impossible de charger le verset du jour');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchVerse();
  }, [dayNumber]);

  if (isLoading) {
    return (
      <Card className="bg-white border-none shadow-sm">
        <CardContent className="p-6">
          <h2 className="text-lg font-semibold mb-3">Verset du jour</h2>
          <div className="bg-green-50 p-4 rounded-lg border border-green-100 flex justify-center items-center h-24">
            <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-green-500"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="bg-white border-none shadow-sm">
        <CardContent className="p-6">
          <h2 className="text-lg font-semibold mb-3">Verset du jour</h2>
          <div className="bg-green-50 p-4 rounded-lg border border-green-100">
            <p className="text-gray-700 italic mb-2">Erreur: {error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!verseOfDay) {
    return (
      <Card className="bg-white border-none shadow-sm">
        <CardContent className="p-6">
          <h2 className="text-lg font-semibold mb-3">Verset du jour</h2>
          <div className="bg-green-50 p-4 rounded-lg border border-green-100">
            <p className="text-gray-700 italic mb-2">Verset du jour non disponible pour le jour {dayNumber}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

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
