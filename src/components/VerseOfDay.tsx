import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Book } from 'lucide-react';
import { getDailyVerse, getDefaultVerse } from '@/services/readingPlan/verseService';
import { useQuery } from '@tanstack/react-query';
import { useIsMobile } from '@/hooks/use-mobile';
import { useVerseLikes } from '@/hooks/useVerseLikes';
import VerseCardMobile from './verse/VerseCardMobile';
import VerseCardDesktop from './verse/VerseCardDesktop';

interface VerseOfDayProps {
  dayNumber: number;
}

/**
 * Composant pour afficher la sagesse du jour
 * Design responsive : carte gradient sur mobile, carte classique sur desktop
 */
const VerseOfDay: React.FC<VerseOfDayProps> = ({ dayNumber }) => {
  const isMobile = useIsMobile();
  
  const fetchVerse = async () => {
    if (dayNumber > 1000 || dayNumber < 1) {
      return await getDefaultVerse(dayNumber);
    }
    
    try {
      const verse = await getDailyVerse(dayNumber);
      return verse;
    } catch (error) {
      console.error(`Error fetching verse for day ${dayNumber}:`, error);
      return await getDefaultVerse(dayNumber);
    }
  };

  const { data: verse, isLoading: verseLoading, error } = useQuery({
    queryKey: ['daily-verse', dayNumber],
    queryFn: fetchVerse,
    staleTime: 24 * 60 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
    retry: 1
  });

  const { likesCount, hasLiked, isLoading: likesLoading, toggleLike } = useVerseLikes(dayNumber);

  // Loading state
  if (verseLoading) {
    if (isMobile) {
      return (
        <div className="rounded-2xl bg-verse-gradient min-h-[420px] animate-pulse flex items-center justify-center">
          <div className="h-4 bg-white/20 rounded w-3/4"></div>
        </div>
      );
    }
    
    return (
      <Card className="bg-card border-border">
        <CardContent className="p-6 text-center">
          <div className="animate-pulse-soft">
            <div className="h-4 bg-muted rounded w-3/4 mx-auto mb-2"></div>
            <div className="h-3 bg-muted rounded w-1/2 mx-auto"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (error || !verse) {
    return (
      <Card className="bg-card border-border">
        <CardContent className="p-6 text-center">
          <div className="flex items-center justify-center mb-4">
            <Book className="h-8 w-8 text-primary" />
          </div>
          <h2 className="text-lg font-semibold text-foreground mb-3">Sagesse du jour</h2>
          <p className="text-muted-foreground italic">
            "Sagesse du Jour"
          </p>
        </CardContent>
      </Card>
    );
  }

  // Render mobile or desktop version
  if (isMobile) {
    return (
      <VerseCardMobile
        verse={verse}
        likesCount={likesCount}
        hasLiked={hasLiked}
        onToggleLike={toggleLike}
        isLoading={likesLoading}
      />
    );
  }

  return (
    <VerseCardDesktop
      verse={verse}
      likesCount={likesCount}
      hasLiked={hasLiked}
      onToggleLike={toggleLike}
      isLoading={likesLoading}
    />
  );
};

export default VerseOfDay;
