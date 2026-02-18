import React, { useEffect, useState } from 'react';
import { ArrowLeft, BookOpen, CheckCircle, BookMarked, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import CircularProgress from '@/components/CircularProgress';
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';
import { getOverallProgress } from '@/services/readingPlan';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { useInitialPageLoad } from '@/hooks/useInitialPageLoad';

/**
 * Récupère le nombre de passages lus cette semaine (lundi → dimanche)
 */
const getWeeklyPassagesRead = async (userId: string): Promise<number> => {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0 = dimanche
  const diffToMonday = (dayOfWeek === 0 ? -6 : 1 - dayOfWeek);
  const monday = new Date(now);
  monday.setDate(now.getDate() + diffToMonday);
  monday.setHours(0, 0, 0, 0);

  const { count } = await supabase
    .from('user_progress')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('status', 'completed')
    .gte('completed_at', monday.toISOString());

  return count || 0;
};

/**
 * Page dédiée aux statistiques détaillées
 */
const ProfileStatistics = () => {
  const { user, progressUpdateCounter } = useOptimizedAuth();
  const isInitialLoad = useInitialPageLoad(user?.id);

  const { data: stats, isLoading } = useQuery({
    queryKey: ['userStats', user?.id, progressUpdateCounter],
    queryFn: () => user ? getOverallProgress(user.id) : null,
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const { data: weeklyCount = 0 } = useQuery({
    queryKey: ['weeklyPassages', user?.id],
    queryFn: () => user ? getWeeklyPassagesRead(user.id) : 0,
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });

  const statItems = [
    {
      label: 'Jours complétés',
      value: stats?.completedDays ?? 0,
      icon: CheckCircle,
      color: 'text-primary',
      bg: 'bg-primary/10',
    },
    {
      label: 'Passages lus',
      value: stats?.passagesRead ?? 0,
      icon: BookOpen,
      color: 'text-accent-foreground',
      bg: 'bg-accent/10',
    },
    {
      label: 'Passages restants',
      value: stats?.passagesRemaining ?? 0,
      icon: BookMarked,
      color: 'text-muted-foreground',
      bg: 'bg-muted',
    },
    {
      label: 'Passages cette semaine',
      value: weeklyCount,
      icon: TrendingUp,
      color: 'text-primary',
      bg: 'bg-primary/5',
    },
  ];

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="bg-card border-b">
        <div className="px-6 py-4 flex items-center space-x-4">
          <Link to="/profile">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-xl font-bold text-foreground">Statistiques</h1>
        </div>
      </div>

      <div className="px-4 py-6 space-y-4">
        {/* Progression globale avec camembert */}
        <Card className="border-border shadow-sm">
          <CardContent className="p-5">
            <h2 className="text-sm font-semibold text-primary bg-primary/5 py-2 rounded-md text-center mb-5 uppercase tracking-wide">
              Progression globale
            </h2>

            {isLoading ? (
              <div className="flex justify-center items-center h-32">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary" />
              </div>
            ) : (
              <div className="flex items-center gap-4">
                {/* Stats textuelles */}
                <div className="flex-1 space-y-2">
                  <div className="grid grid-cols-2 items-center bg-secondary/50 p-2 rounded-md">
                    <span className="text-sm text-foreground font-medium">Total</span>
                    <span className="text-right font-bold text-sm">{stats?.totalPassages ?? 0}</span>
                  </div>
                  <div className="grid grid-cols-2 items-center bg-accent/10 p-2 rounded-md">
                    <span className="text-sm text-foreground font-medium">Lus</span>
                    <span className="text-right font-bold text-sm">{stats?.passagesRead ?? 0}</span>
                  </div>
                  <div className="grid grid-cols-2 items-center bg-muted p-2 rounded-md">
                    <span className="text-sm text-foreground font-medium">Restants</span>
                    <span className="text-right font-bold text-sm">{stats?.passagesRemaining ?? 0}</span>
                  </div>
                </div>

                {/* Camembert */}
                <div className="flex-shrink-0">
                  <CircularProgress
                    progress={stats?.progressPercentage ?? 0}
                    size={120}
                    className="text-primary"
                    isInitialLoad={isInitialLoad}
                  />
                </div>
              </div>
            )}

            {/* Légende */}
            <div className="flex justify-center mt-4 gap-4">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-primary rounded-full" />
                <span className="text-xs text-muted-foreground">Lus</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-muted-foreground/40 rounded-full" />
                <span className="text-xs text-muted-foreground">Restants</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Grille de stats détaillées */}
        <div className="grid grid-cols-2 gap-3">
          {statItems.map((item) => (
            <Card key={item.label} className="border-border shadow-sm">
              <CardContent className="p-4">
                <div className={`w-9 h-9 rounded-full ${item.bg} flex items-center justify-center mb-3`}>
                  <item.icon className={`h-5 w-5 ${item.color}`} />
                </div>
                <p className="text-2xl font-bold text-foreground">{item.value}</p>
                <p className="text-xs text-muted-foreground mt-1 leading-tight">{item.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ProfileStatistics;
