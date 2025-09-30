
import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Book } from 'lucide-react';
import { getDailyVerse, getDefaultVerse } from '@/services/readingPlan/verseService';
import { useQuery } from '@tanstack/react-query';

interface VerseOfDayProps {
  dayNumber: number;
}

/**
 * Composant pour afficher la sagesse du jour
 */
const VerseOfDay: React.FC<VerseOfDayProps> = ({ dayNumber }) => {
  
  const fetchVerse = async () => {
    console.log(`VerseOfDay component: fetching verse for day ${dayNumber}`);
    
    // Limiter aux jours valides et utiliser un verset par défaut si hors limite
    // Note: La limite est maintenant basée sur la durée du plan utilisateur
    if (dayNumber > 1000 || dayNumber < 1) {
      return await getDefaultVerse(dayNumber);
    }
    
    try {
      const verse = await getDailyVerse(dayNumber);
      return verse;
    } catch (error) {
      console.error(`Error fetching verse for day ${dayNumber}:`, error);
      // En cas d'erreur, utiliser le verset par défaut
      return await getDefaultVerse(dayNumber);
    }
  };

  const { data: verse, isLoading, error } = useQuery({
    queryKey: ['daily-verse', dayNumber],
    queryFn: fetchVerse,
    staleTime: 24 * 60 * 60 * 1000, // 24 heures
    gcTime: 24 * 60 * 60 * 1000,
    retry: 1 // Réessayer une seule fois en cas d'erreur
  });

  if (isLoading) {
    return (
      <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
        <CardContent className="p-6 text-center">
          <div className="animate-pulse-soft">
            <div className="h-4 bg-green-200 rounded w-3/4 mx-auto mb-2"></div>
            <div className="h-3 bg-green-200 rounded w-1/2 mx-auto"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Déterminer le contenu à afficher
  const wisdomContent = verse?.wisdomType || "Sagesse du Jour";

  if (error) {
    return (
      <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
        <CardContent className="p-6 text-center">
          <div className="flex items-center justify-center mb-4">
            <Book className="h-8 w-8 text-green-600" />
          </div>
          <h2 className="text-lg font-semibold text-green-800 mb-3">Sagesse du jour</h2>
          <p className="text-muted-foreground italic">
            "Sagesse du Jour"
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
      <CardContent className="p-6 text-center">
        <div className="flex items-center justify-center mb-4">
          <Book className="h-8 w-8 text-green-600" />
        </div>
        <h2 className="text-lg font-semibold text-green-800 mb-3">{wisdomContent}</h2>
        <blockquote className="text-foreground italic text-base mb-4 leading-relaxed">
          "{verse.text}"
        </blockquote>
        {verse?.reference && (
          <cite className="text-sm text-green-700 font-medium">
            {verse.reference}
          </cite>
        )}
      </CardContent>
    </Card>
  );
};

export default VerseOfDay;
