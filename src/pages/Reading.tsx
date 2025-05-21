
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import NavBar from '@/components/NavBar';
import DayCard from '@/components/DayCard';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { formatDateToFrench } from '@/utils/readingPlanUtils';

// Helper function to calculate days passed since the start date
const calculateDaysSinceStart = (startDateStr: string) => {
  const startDate = new Date(startDateStr);
  const today = new Date();
  const diffTime = Math.abs(today.getTime() - startDate.getTime());
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
};

// Helper function to format date
const formatDate = (startDateStr: string, dayOffset: number) => {
  const startDate = new Date(startDateStr);
  startDate.setDate(startDate.getDate() + dayOffset);
  return formatDateToFrench(startDate);
};

// Helper to check if a date is today
const isToday = (startDateStr: string, dayOffset: number) => {
  const startDate = new Date(startDateStr);
  startDate.setDate(startDate.getDate() + dayOffset);
  
  const today = new Date();
  return startDate.getDate() === today.getDate() && 
         startDate.getMonth() === today.getMonth() && 
         startDate.getFullYear() === today.getFullYear();
};

const Reading = () => {
  const { profile, isLoading } = useAuth();
  const [days, setDays] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const navigate = useNavigate();
  
  useEffect(() => {
    if (!isLoading && profile) {
      const fetchReadingPlan = async () => {
        setLoading(true);
        
        try {
          // Fetch reading plan chapters
          const { data: chaptersData, error: chaptersError } = await supabase
            .from('reading_plan_chapters')
            .select('*')
            .order('day_number', { ascending: true });
            
          if (chaptersError) throw chaptersError;
          
          // Fetch user progress
          const { data: progressData, error: progressError } = await supabase
            .from('user_progress')
            .select('*')
            .eq('user_id', profile.id);
            
          if (progressError) throw progressError;
          
          // Process the data
          const processedDays: any[] = [];
          
          for (const chapter of chaptersData) {
            const dayProgress = progressData.filter(
              (p: any) => p.chapter_id === chapter.id
            );
            
            const completed = dayProgress.length > 0 && 
                             dayProgress[0].status === 'completed';
            
            processedDays.push({
              day: chapter.day_number,
              reference: chapter.reference,
              description: chapter.description,
              completed,
              date: formatDate(profile.start_date, chapter.day_number - 1),
              isToday: isToday(profile.start_date, chapter.day_number - 1)
            });
          }
          
          setDays(processedDays);
        } catch (error: any) {
          toast({
            title: "Erreur",
            description: `Impossible de charger le plan de lecture: ${error.message}`,
            variant: "destructive"
          });
        } finally {
          setLoading(false);
        }
      };
      
      fetchReadingPlan();
    }
  }, [profile, isLoading, toast]);
  
  const handleDayClick = (day: any) => {
    navigate(`/reading/${day.day}`);
  };
  
  if (isLoading || loading) {
    return <div>Chargement...</div>;
  }
  
  return (
    <div className="min-h-screen bg-gray-50">
      <NavBar />
      <div className="container mx-auto p-4">
        <h1 className="text-2xl font-bold mb-6">Plan de lecture</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {days.map((day) => (
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
    </div>
  );
};

export default Reading;
