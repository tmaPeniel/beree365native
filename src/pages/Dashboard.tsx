
/**
 * Page de tableau de bord
 * VERSION SIMPLIFIÉE avec service de date centralisé
 */

import React from 'react';
import ProgressStats from '@/components/ProgressStats';
import ReadingPlan from '@/components/ReadingPlan';
import VerseOfDay from '@/components/VerseOfDay';
import TodayDisplay from '@/components/TodayDisplay';
import NotificationCenter from '@/components/notifications/NotificationCenter';
import { useIsMobile } from '@/hooks/use-mobile';
import { useAuth } from '@/hooks/useAuth';
import { useDateService } from '@/hooks/useDateService';
import { usePlanDuration } from '@/hooks/usePlanDuration';
import PlanDates from '@/components/ui/PlanDate';

const Dashboard = () => {
  const isMobile = useIsMobile();
  const { profile, isLoading } = useAuth();
  const { currentDayNumber, isLoading: dayLoading, getStats, planDuration } = useDateService();
  const { planName, planDuration: hookPlanDuration } = usePlanDuration();
  const today = new Date();
  
  // Calculer les statistiques du plan
  const stats = getStats();
  
  // Utiliser la durée du hook dédié (plus fiable après changement de plan)
  const effectivePlanDuration = hookPlanDuration || planDuration;
  
  // Calculer les dates du plan dynamiquement selon le plan choisi
  const startDate = profile?.start_date ? new Date(profile.start_date) : today;
  const endDate = new Date(startDate);
  endDate.setDate(startDate.getDate() + (effectivePlanDuration - 1));
  
  if (isLoading || !profile || dayLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Chargement...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="bg-card p-4 md:p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl md:text-2xl font-bold mb-1 md:mb-2">
              {planName || `Le Tour de ma Bible en ${effectivePlanDuration} jours`}
            </h1>
            <p className="text-sm md:text-base text-muted-foreground">SISAP Editions Powered</p>
          </div>
          <NotificationCenter />
        </div>
      </div>

      <div className="p-4 md:p-6 space-y-4 md:space-y-6">
        <TodayDisplay 
          dayNumber={currentDayNumber} 
          date={today} 
          userName={profile?.full_name || 'Utilisateur'} 
        />
      
        <VerseOfDay dayNumber={currentDayNumber} />
        
        <ProgressStats />

        <div className={`${isMobile ? '' : 'grid grid-cols-2 gap-6'}`}>
          <PlanDates
            startDate={startDate}
            endDate={endDate}
            remainingDays={stats.remainingDays}
          />
          
          <ReadingPlan dayNumber={currentDayNumber} />
        </div>
      </div>
      
    </div>
  );
};

export default Dashboard;
