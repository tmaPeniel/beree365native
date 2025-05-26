
/**
 * Page de plan de lecture
 * Affiche l'ensemble du plan de lecture avec les jours et leur état
 */

import React, { useState, useEffect } from 'react';
import { useToast } from "@/hooks/use-toast";
import NavBar from '@/components/NavBar';
import DayCard from '@/components/DayCard';
import DayReadingDialog from '@/components/DayReadingDialog';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { formatDateToFrench } from '@/utils/readingPlanUtils';
import { toast } from 'sonner';

/**
 * Calcule le nombre de jours écoulés depuis la date de début
 * @param {string} startDateStr Date de début au format chaîne
 * @returns {number} Nombre de jours écoulés
 */
const calculateDaysSinceStart = (startDateStr: string) => {
  const startDate = new Date(startDateStr);
  const today = new Date();
  const diffTime = Math.abs(today.getTime() - startDate.getTime());
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
};

/**
 * Formate la date en ajoutant un offset de jours à la date de début
 * @param {string} startDateStr Date de début au format chaîne
 * @param {number} dayOffset Nombre de jours à ajouter
 * @returns {string} Date formatée en français
 */
const formatDate = (startDateStr: string, dayOffset: number) => {
  const startDate = new Date(startDateStr);
  startDate.setDate(startDate.getDate() + dayOffset);
  return formatDateToFrench(startDate);
};

/**
 * Vérifie si une date correspond à aujourd'hui
 * @param {string} startDateStr Date de début au format chaîne
 * @param {number} dayOffset Nombre de jours à ajouter
 * @returns {boolean} Vrai si la date correspond à aujourd'hui
 */
const isToday = (startDateStr: string, dayOffset: number) => {
  const startDate = new Date(startDateStr);
  startDate.setDate(startDate.getDate() + dayOffset);
  const today = new Date();
  return startDate.getDate() === today.getDate() && startDate.getMonth() === today.getMonth() && startDate.getFullYear() === today.getFullYear();
};

/**
 * Page de plan de lecture
 */
const Reading = () => {
  const {
    profile,
    isLoading: authLoading,
    progressUpdateCounter
  } = useAuth();
  const [days, setDays] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const {
    toast: useToastHook
  } = useToast();
  const [selectedDay, setSelectedDay] = useState<{
    day: number;
    date: string;
  } | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currentDayNumber, setCurrentDayNumber] = useState(1);

  // Calcul du jour courant basé sur la date de début
  useEffect(() => {
    if (profile?.start_date) {
      const startDate = new Date(profile.start_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      startDate.setHours(0, 0, 0, 0);
      
      const diffTime = today.getTime() - startDate.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      
      // Le jour 1 commence le jour de la date de début
      const calculatedDay = Math.max(1, diffDays + 1);
      console.log(`Reading page: Current day number is ${calculatedDay} from start date ${profile.start_date}`);
      setCurrentDayNumber(calculatedDay);
    }
  }, [profile]);

  // Récupérer les données du plan de lecture
  useEffect(() => {
    if (!authLoading && profile) {
      const fetchReadingPlan = async () => {
        setLoading(true);
        try {
          // Récupérer les chapitres du plan de lecture
          const {
            data: chaptersData,
            error: chaptersError
          } = await supabase.from('reading_plan_chapters').select('*').order('day_number', {
            ascending: true
          });
          if (chaptersError) throw chaptersError;

          // Récupérer la progression de l'utilisateur
          const {
            data: progressData,
            error: progressError
          } = await supabase.from('user_progress').select('*').eq('user_id', profile.id);
          if (progressError) throw progressError;

          // Traiter les données
          const uniqueDays = Array.from(new Set(chaptersData.map((chapter: any) => chapter.day_number)));
          const processedDays: any[] = [];
          for (const dayNum of uniqueDays) {
            // Filtrer les chapitres pour ce jour
            const dayChapters = chaptersData.filter((chapter: any) => chapter.day_number === dayNum);

            // Vérifier si tous les chapitres du jour sont complétés
            const dayChapterIds = dayChapters.map((chapter: any) => chapter.id);
            const completedChapters = progressData.filter((p: any) => dayChapterIds.includes(p.chapter_id) && p.status === 'completed');
            const isDayCompleted = completedChapters.length === dayChapterIds.length && dayChapterIds.length > 0;
            processedDays.push({
              day: dayNum,
              completed: isDayCompleted,
              date: formatDate(profile.start_date, dayNum - 1),
              isToday: isToday(profile.start_date, dayNum - 1)
            });
          }

          // Trier par numéro de jour croissant
          processedDays.sort((a, b) => a.day - b.day);
          setDays(processedDays);
        } catch (error: any) {
          useToastHook({
            title: "Erreur",
            description: `Impossible de charger le plan de lecture: ${error.message}`,
            variant: "destructive"
          });
          toast.error(`Impossible de charger le plan de lecture: ${error.message}`);
        } finally {
          setLoading(false);
        }
      };
      fetchReadingPlan();
    }
  }, [profile, authLoading, useToastHook, progressUpdateCounter]);

  /**
   * Gère le clic sur une carte de jour
   * @param {Object} day Données du jour
   */
  const handleDayClick = (day: any) => {
    console.log(`Selected day ${day.day}, date: ${day.date}`);
    setSelectedDay({
      day: day.day,
      date: day.date
    });
    setIsDialogOpen(true);
  };
  
  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setSelectedDay(null);
  };

  // Afficher un indicateur de chargement
  if (authLoading || loading) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
      </div>;
  }
  
  return <div className="min-h-screen bg-gray-50 pb-20">
      <div className="bg-white p-4 md:p-6 shadow-sm mb-4 md:mb-6">
        <h1 className="text-xl md:text-2xl font-bold">Plan de lecture</h1>
        <p className="text-gray-500">Suivez votre progression au fil des jours</p>
      </div>
      
      <div className="container mx-auto px-4 pb-16">
        {/* Affichage du jour actuel sur mobile */}
        <div className="md:hidden mb-4 p-4 bg-green-50 rounded-lg border border-green-100">
          <p className="font-medium">Aujourd'hui: Jour {currentDayNumber}</p>
        </div>
        
        {/* Affichage des cartes de jours - nouveau layout pour mobile */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
          {days.map(day => <DayCard key={day.day} day={day.day} date={day.date} completed={day.completed} isToday={day.isToday} onClick={() => handleDayClick(day)} />)}
        </div>
      </div>
      
      {/* Dialog pour afficher les passages du jour sélectionné */}
      {selectedDay && <DayReadingDialog day={selectedDay.day} date={selectedDay.date} isOpen={isDialogOpen} onClose={handleCloseDialog} />}
      
      {/* Barre de navigation */}
      <NavBar />
    </div>;
};

export default Reading;
