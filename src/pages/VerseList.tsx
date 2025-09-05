import { useEffect, useState } from 'react';
import { ArrowLeft, Calendar, BookOpen } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { getDailyVerse } from '@/services/readingPlan/verseService';
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';
import { useDateService } from '@/hooks/useDateService';
import { DailyVerse } from '@/types/supabase';

export default function VerseList() {
  const navigate = useNavigate();
  const { user } = useOptimizedAuth();
  const { currentDayNumber } = useDateService();
  const [verses, setVerses] = useState<DailyVerse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchVerses = async () => {
      if (!user || !currentDayNumber) return;
      
      setLoading(true);
      const versesData: DailyVerse[] = [];
      
      // Récupérer tous les versets du jour 1 au jour actuel
      for (let day = 1; day <= currentDayNumber; day++) {
        try {
          const verse = await getDailyVerse(day);
          if (verse) {
            versesData.push(verse);
          }
        } catch (error) {
          console.error(`Error fetching verse for day ${day}:`, error);
        }
      }
      
      setVerses(versesData);
      setLoading(false);
    };

    fetchVerses();
  }, [user, currentDayNumber]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
          <div className="container flex items-center gap-4 h-16 px-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/profile')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-semibold">Versets du jour</h1>
          </div>
        </div>
        
        <div className="container px-4 py-6">
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <Skeleton className="h-4 w-20 mb-3" />
                  <Skeleton className="h-16 w-full mb-2" />
                  <Skeleton className="h-4 w-24" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="container flex items-center gap-4 h-16 px-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/profile')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            <h1 className="text-xl font-semibold">Versets du jour</h1>
          </div>
        </div>
      </div>

      <div className="container px-4 py-6">
        <div className="mb-6">
          <p className="text-muted-foreground">
            Découvrez tous les versets depuis le début de votre parcours (jour 1 à {currentDayNumber})
          </p>
        </div>

        <ScrollArea className="h-[calc(100vh-200px)]">
          <div className="space-y-4">
            {verses.map((verse) => (
              <Card key={verse.id} className="transition-colors hover:bg-muted/50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Calendar className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium text-primary">
                      Jour {verse.day_number}
                    </span>
                  </div>
                  
                  <div className="space-y-2">
                    {verse.wisdomType && (
                      <p className="text-base leading-relaxed text-foreground">
                        {verse.wisdomType}
                      </p>
                    )}
                    
                    {verse.text && (
                      <p className="text-base leading-relaxed text-foreground italic">
                        "{verse.text}"
                      </p>
                    )}
                    
                    <p className="text-sm text-muted-foreground font-medium">
                      — {verse.reference}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}