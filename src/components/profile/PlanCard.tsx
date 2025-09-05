import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BookOpen, Calendar, Clock } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { getUserPlan } from '@/services/readingPlan/planService';
import PlanChangeDialog from './PlanChangeDialog';

const PlanCard: React.FC = () => {
  const { user, isLoading: authLoading } = useAuth();
  
  const { data: currentPlan, isLoading: planLoading, refetch, error } = useQuery({
    queryKey: ['user-plan', user?.id],
    queryFn: () => user ? getUserPlan(user.id) : null,
    enabled: !!user && !authLoading,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const handlePlanChanged = () => {
    refetch();
  };

  const isLoading = authLoading || planLoading;

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-muted rounded w-1/3"></div>
            <div className="h-3 bg-muted rounded w-2/3"></div>
            <div className="h-3 bg-muted rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    console.error('Erreur lors du chargement du plan:', error);
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            Plan de lecture
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Erreur de chargement du plan</p>
          <button 
            onClick={() => refetch()} 
            className="text-primary hover:underline text-sm mt-2"
          >
            Réessayer
          </button>
        </CardContent>
      </Card>
    );
  }

  if (!currentPlan) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" />
              Plan de lecture
            </CardTitle>
            <PlanChangeDialog 
              currentPlan={undefined} 
              onPlanChanged={handlePlanChanged}
            />
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Aucun plan de lecture trouvé</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            Plan de lecture
          </CardTitle>
          <PlanChangeDialog 
            currentPlan={currentPlan} 
            onPlanChanged={handlePlanChanged}
          />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <h3 className="font-semibold text-lg">{currentPlan.name}</h3>
          {currentPlan.description && (
            <p className="text-muted-foreground text-sm mt-1">
              {currentPlan.description}
            </p>
          )}
        </div>
        
        <div className="flex items-center gap-4">
          <Badge variant="secondary" className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {currentPlan.duration_days} jours
          </Badge>
          <Badge variant="outline" className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            Plan actif
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
};

export default PlanCard;