import { ArrowLeft, Calendar, BookOpen, Heart } from 'lucide-react';
import { formatNumber } from '@/lib/formatNumber';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { getAllVersesUpToDay } from '@/services/readingPlan/verseService';
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';
import { useDateService } from '@/hooks/useDateService';
import { DailyVerse } from '@/types/supabase';
import ThemeFilter from '@/components/ThemeFilter';

export default function VerseList() {
  const navigate = useNavigate();
  const { user } = useOptimizedAuth();
  const { currentDayNumber } = useDateService();
  const [selectedTheme, setSelectedTheme] = useState<string>('all');

  // Utiliser React Query pour le cache et la gestion d'état optimisée
  const { 
    data: verses = [], 
    isLoading: loading, 
    error 
  } = useQuery({
    queryKey: ['verses', currentDayNumber],
    queryFn: () => getAllVersesUpToDay(currentDayNumber || 1),
    enabled: !!user && !!currentDayNumber,
    staleTime: 5 * 60 * 1000, // 5 minutes de cache
    gcTime: 30 * 60 * 1000, // 30 minutes avant garbage collection
  });

  // Calculer les thématiques uniques et les versets filtrés
  const { availableThemes, filteredVerses } = useMemo(() => {
    const themes = Array.from(new Set(
      verses
        .map(verse => verse.wisdomType)
        .filter(Boolean) as string[]
    ));
    
    const filtered = selectedTheme === 'all' 
      ? verses 
      : verses.filter(verse => verse.wisdomType === selectedTheme);
    
    return {
      availableThemes: themes,
      filteredVerses: filtered
    };
  }, [verses, selectedTheme]);

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
        {/* Filtre par thématique */}
        <div className="mb-6">
          <ThemeFilter
            themes={availableThemes}
            selectedTheme={selectedTheme}
            onThemeChange={setSelectedTheme}
            verseCount={filteredVerses.length}
          />
        </div>

        <ScrollArea className="h-[calc(100vh-280px)]">
          <div className="space-y-4">
            {filteredVerses.map((verse) => (
              <Card key={verse.id} className="transition-colors hover:bg-muted/50">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium text-primary">
                        Jour {verse.day_number}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Heart className="h-4 w-4" />
                      <span className="text-sm">
                        {formatNumber(verse.likes_count || 0)}
                      </span>
                    </div>
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