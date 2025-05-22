
/**
 * Page de tableau de bord
 * Affiche un aperçu du plan de lecture et des statistiques
 */

import React, { useEffect, useState } from 'react';
import NavBar from '@/components/NavBar';
import ProgressStats from '@/components/ProgressStats';
import ReadingPlan from '@/components/ReadingPlan';
import VerseOfDay from '@/components/VerseOfDay';
import TodayDisplay from '@/components/TodayDisplay';
import { useIsMobile } from '@/hooks/use-mobile';
import { useAuth } from '@/hooks/useAuth';
import { calculateDayNumber } from '@/services/readingPlanService';
import PlanDates from '@/components/ui/PlanDate';

/**
 * Page de tableau de bord
 */
const Dashboard = () => {
  const isMobile = useIsMobile();
  const { profile, isLoading } = useAuth();
  const [dayNumber, setDayNumber] = useState(1);
  const [remainingDays, setRemainingDays] = useState(365);
  const today = new Date();
  
  // Calculer le numéro du jour et les jours restants
  useEffect(() => {
    if (profile?.start_date) {
      const startDate = new Date(profile.start_date);
      const calculatedDay = calculateDayNumber(startDate);
      setDayNumber(calculatedDay);
      setRemainingDays(365 - (calculatedDay - 1));
    }
  }, [profile]);
  
  // Calculer les dates du plan
  const startDate = profile?.start_date ? new Date(profile.start_date) : today;
  const endDate = new Date(startDate);
  endDate.setDate(startDate.getDate() + 364); // 365 jours au total, donc +364
  
  // Afficher un indicateur de chargement
  if (isLoading || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="bg-white p-4 md:p-6 shadow-sm">
        <h1 className="text-xl md:text-2xl font-bold mb-1 md:mb-2">Le Tour de ma Bible en 365 jours</h1>
        <p className="text-sm md:text-base text-gray-500">SISAP Editions Powered</p>
      </div>

      <div className="p-4 md:p-6 space-y-4 md:space-y-6">
        {/* Affichage du jour actuel */}
        <TodayDisplay 
          dayNumber={dayNumber} 
          date={today} 
          userName={profile?.full_name || 'Utilisateur'} 
        />
      
        {/* Verset du jour */}
        <VerseOfDay dayNumber={dayNumber} />
        
        {/* Statistiques de progression */}
        <ProgressStats />

        <div className={`${isMobile ? '' : 'grid grid-cols-2 gap-6'}`}>
          {/* Dates du plan */}
          <PlanDates
            startDate={startDate}
            endDate={endDate}
            remainingDays={remainingDays}
          />
          
          {/* Plan de lecture du jour */}
          <ReadingPlan dayNumber={dayNumber} />
        </div>
      </div>
      
      {/* Barre de navigation */}
      <NavBar />
    </div>
  );
};

export default Dashboard;
