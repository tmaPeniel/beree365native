
/**
 * Page de plan de lecture optimisée avec cartes étendues
 */

import React, { useState, useMemo, useEffect } from 'react';
import { useToast } from "@/hooks/use-toast";
import NavBar from '@/components/NavBar';
import ExpandedDayCard from '@/components/ExpandedDayCard';
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';
import { supabase } from '@/integrations/supabase/client';
import { formatDateToFrench } from '@/utils/readingPlanUtils';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';

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
 * Page de plan de lecture optimisée avec cartes étendues
 */
const Reading = React.memo(() => {
  const { profile, isLoading: authLoading, progressUpdateCounter } = useOptimizedAuth();
  const { toast: useToastHook } = useToast();

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

  // Requête ultra-optimisée qui récupère TOUT en une seule fois
  const { data: optimizedData = null, isLoading: dataLoading, error } = useQuery({
    queryKey: ['reading-plan-full-data', profile?.id, progressUpdateCounter],
    queryFn: async () => {
      if (!profile) return null;
      
      console.log('Fetching all reading plan data in single optimized query...');
      
      // Récupérer tous les chapitres avec leur progression en une seule requête
      const { data: chaptersWithProgress, error: chaptersError } = await supabase
        .from('reading_plan_chapters')
        .select(`
          id, 
          day_number, 
          reference,
          user_progress!left(
            id,
            status,
            completed_at,
            user_id
          )
        `)
        .eq('user_progress.user_id', profile.id)
        .order('day_number', { ascending: true });
      
      if (chaptersError) throw chaptersError;

      console.log(`Fetched ${chaptersWithProgress?.length || 0} chapters with progress in single query`);

      // Grouper les données par jour
      const dayGroups = new Map();
      
      chaptersWithProgress?.forEach(chapter => {
        const dayNum = chapter.day_number;
        if (!dayGroups.has(dayNum)) {
          dayGroups.set(dayNum, {
            day: dayNum,
            chapters: [],
            date: formatDate(profile.start_date, dayNum - 1),
            isToday: isToday(profile.start_date, dayNum - 1)
          });
        }
        
        const dayData = dayGroups.get(dayNum);
        dayData.chapters.push({
          id: chapter.id,
          reference: chapter.reference,
          completed: chapter.user_progress && chapter.user_progress.length > 0 
            ? chapter.user_progress[0].status === 'completed' 
            : false,
          progressId: chapter.user_progress && chapter.user_progress.length > 0 
            ? chapter.user_progress[0].id 
            : null
        });
      });

      // Calculer la progression pour chaque jour
      const daysWithProgress = Array.from(dayGroups.values()).map(day => {
        const completedChapters = day.chapters.filter(chapter => chapter.completed);
        const progressPercentage = day.chapters.length > 0 
          ? Math.round((completedChapters.length / day.chapters.length) * 100) 
          : 0;
        
        return {
          ...day,
          progressPercentage,
          completed: progressPercentage === 100
        };
      });

      console.log(`Processed ${daysWithProgress.length} days with progress calculations`);
      return daysWithProgress;
    },
    enabled: !!profile && !authLoading,
    staleTime: 5 * 60 * 1000, // 5 minutes
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

  // Loading state
  if (authLoading || dataLoading) {
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
        
        {/* Grille des cartes étendues optimisées */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
          {optimizedData?.map(dayData => (
            <ExpandedDayCard 
              key={dayData.day} 
              day={dayData.day} 
              date={dayData.date}
              isToday={dayData.isToday}
              chapters={dayData.chapters}
              progressPercentage={dayData.progressPercentage}
            />
          ))}
        </div>
      </div>
      
      <NavBar />
    </div>
  );
});

Reading.displayName = 'Reading';

export default Reading;
