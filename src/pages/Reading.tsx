
/**
 * Page de plan de lecture optimisée
 */

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useToast } from "@/hooks/use-toast";
import NavBar from '@/components/NavBar';
import DayCard from '@/components/DayCard';
import DayReadingDialog from '@/components/DayReadingDialog';
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';
import { supabase } from '@/integrations/supabase/client';
import { formatDateToFrench } from '@/utils/readingPlanUtils';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';

/**
 * Calcule le nombre de jours écoulés depuis la date de début
 */
const calculateDaysSinceStart = (startDateStr: string) => {
  const startDate = new Date(startDateStr);
  const today = new Date();
  const diffTime = Math.abs(today.getTime() - startDate.getTime());
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
};

/**
 * Formate la date en ajoutant un offset de jours
 */
const formatDate = (startDateStr: string, dayOffset: number) => {
  const startDate = new Date(startDateStr);
  startDate.setDate(startDate.getDate() + dayOffset);
  return formatDateToFrench(startDate);
};

/**
 * Vérifie si une date correspond à aujourd'hui
 */
const isToday = (startDateStr: string, dayOffset: number) => {
  const startDate = new Date(startDateStr);
  startDate.setDate(startDate.getDate() + dayOffset);
  const today = new Date();
  return startDate.getDate() === today.getDate() && 
         startDate.getMonth() === today.getMonth() && 
         startDate.getFullYear() === today.getFullYear();
};

/**
 * Page de plan de lecture optimisée
 */
const Reading = React.memo(() => {
  const { profile, isLoading: authLoading, progressUpdateCounter } = useOptimizedAuth();
  const { toast: useToastHook } = useToast();
  const [selectedDay, setSelectedDay] = useState<{ day: number; date: string; } | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Calcul mémorisé du jour courant
  const currentDayNumber = useMemo(() => {
    if (!profile?.start_date) return 1;
    
    const startDate = new Date(profile.start_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    startDate.setHours(0, 0, 0, 0);
    
    const diffTime = today.getTime() - startDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    return Math.max(1, diffDays + 1);
  }, [profile?.start_date]);

  // Requête optimisée pour les données du plan de lecture
  const { data: days = [], isLoading: daysLoading, error } = useQuery({
    queryKey: ['reading-plan-days', profile?.id, progressUpdateCounter],
    queryFn: async () => {
      if (!profile) return [];
      
      // Récupérer les chapitres du plan de lecture
      const { data: chaptersData, error: chaptersError } = await supabase
        .from('reading_plan_chapters')
        .select('id, day_number, reference')
        .order('day_number', { ascending: true });
      
      if (chaptersError) throw chaptersError;

      // Récupérer la progression de l'utilisateur
      const { data: progressData, error: progressError } = await supabase
        .from('user_progress')
        .select('chapter_id, status')
        .eq('user_id', profile.id);
      
      if (progressError) throw progressError;

      // Traitement optimisé des données
      const uniqueDays = Array.from(new Set(chaptersData.map(chapter => chapter.day_number)));
      
      return uniqueDays.map(dayNum => {
        const dayChapters = chaptersData.filter(chapter => chapter.day_number === dayNum);
        const dayChapterIds = dayChapters.map(chapter => chapter.id);
        const completedChapters = progressData.filter(
          p => dayChapterIds.includes(p.chapter_id) && p.status === 'completed'
        );
        
        return {
          day: dayNum,
          completed: completedChapters.length === dayChapterIds.length && dayChapterIds.length > 0,
          date: formatDate(profile.start_date, dayNum - 1),
          isToday: isToday(profile.start_date, dayNum - 1)
        };
      }).sort((a, b) => a.day - b.day);
    },
    enabled: !!profile && !authLoading,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  // Gestion des erreurs avec useEffect
  useEffect(() => {
    if (error) {
      useToastHook({
        title: "Erreur",
        description: `Impossible de charger le plan de lecture: ${error.message}`,
        variant: "destructive"
      });
      toast.error(`Impossible de charger le plan de lecture: ${error.message}`);
    }
  }, [error, useToastHook]);

  // Handlers mémorisés
  const handleDayClick = useCallback((day: any) => {
    console.log(`Selected day ${day.day}, date: ${day.date}`);
    setSelectedDay({ day: day.day, date: day.date });
    setIsDialogOpen(true);
  }, []);
  
  const handleCloseDialog = useCallback(() => {
    setIsDialogOpen(false);
    setSelectedDay(null);
  }, []);

  // Loading state
  if (authLoading || daysLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="bg-white p-4 md:p-6 shadow-sm mb-4 md:mb-6">
        <h1 className="text-xl md:text-2xl font-bold">Plan de lecture</h1>
        <p className="text-gray-500">Suivez votre progression au fil des jours</p>
      </div>
      
      <div className="container mx-auto px-4 pb-16">
        {/* Affichage du jour actuel sur mobile */}
        <div className="md:hidden mb-4 p-4 bg-green-50 rounded-lg border border-green-100">
          <p className="font-medium">Aujourd'hui: Jour {currentDayNumber}</p>
        </div>
        
        {/* Grille des jours optimisée */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
          {days.map(day => (
            <DayCard 
              key={day.day} 
              day={day.day} 
              date={day.date} 
              completed={day.completed} 
              isToday={day.isToday} 
              onClick={() => handleDayClick(day)} 
            />
          ))}
        </div>
      </div>
      
      {/* Dialog optimisé */}
      {selectedDay && (
        <DayReadingDialog 
          day={selectedDay.day} 
          date={selectedDay.date} 
          isOpen={isDialogOpen} 
          onClose={handleCloseDialog} 
        />
      )}
      
      <NavBar />
    </div>
  );
});

Reading.displayName = 'Reading';

export default Reading;
