import React, { useState } from 'react';
import { ArrowLeft, BookOpen, Calendar, CheckCircle, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/hooks/useAuth';
import { getAvailablePlans, getUserPlan, changePlan } from '@/services/readingPlan/planService';
import { toast } from 'sonner';
import type { ReadingPlan } from '@/types/supabase';

/**
 * Page de gestion des plans de lecture
 */
const ReadingPlanManagement = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);

  // Récupérer le plan actuel de l'utilisateur
  const { data: currentPlan, isLoading: currentPlanLoading } = useQuery({
    queryKey: ['user-plan', user?.id],
    queryFn: () => user ? getUserPlan(user.id) : null,
    enabled: !!user,
  });

  // Récupérer tous les plans disponibles
  const { data: availablePlans, isLoading: plansLoading } = useQuery({
    queryKey: ['available-plans'],
    queryFn: getAvailablePlans,
  });

  // Mutation pour changer de plan
  const changePlanMutation = useMutation({
    mutationFn: changePlan,
    onSuccess: () => {
      toast.success('Plan de lecture changé avec succès !');
      queryClient.invalidateQueries({ queryKey: ['user-plan'] });
      queryClient.invalidateQueries({ queryKey: ['user-progress'] });
      setSelectedPlanId(null);
    },
    onError: (error: any) => {
      console.error('Erreur lors du changement de plan:', error);
      toast.error('Erreur lors du changement de plan');
    },
  });

  const handleChangePlan = (planId: string) => {
    if (planId === currentPlan?.id) {
      toast.info('Ce plan est déjà sélectionné');
      return;
    }
    
    setSelectedPlanId(planId);
    changePlanMutation.mutate(planId);
  };

  const isLoading = currentPlanLoading || plansLoading;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="bg-card border-b">
          <div className="px-6 py-4">
            <div className="flex items-center space-x-4">
              <Link to="/profile">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <h1 className="text-xl font-bold text-foreground">Plans de lecture</h1>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b">
        <div className="px-6 py-4">
          <div className="flex items-center space-x-4">
            <Link to="/profile">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <h1 className="text-xl font-bold text-foreground">Plans de lecture</h1>
          </div>
        </div>
      </div>

      {/* Contenu */}
      <div className="px-6 py-6 space-y-6">
        {/* Plan actuel */}
        {currentPlan && (
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-primary" />
                  Plan actuel
                </CardTitle>
                <Badge variant="default">Actif</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-foreground">
                  {currentPlan.name}
                </h3>
                {currentPlan.description && (
                  <p className="text-muted-foreground">
                    {currentPlan.description}
                  </p>
                )}
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    {currentPlan.duration_days} jours
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    Environ {Math.ceil(currentPlan.duration_days / 30)} mois
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Avertissement changement de plan */}
        <Alert>
          <AlertDescription>
            <strong>Attention :</strong> Changer de plan de lecture supprimera votre progression actuelle 
            et réinitialisera vos badges. Cette action est irréversible.
          </AlertDescription>
        </Alert>

        {/* Plans disponibles */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">
            Plans disponibles
          </h2>
          
          <div className="grid gap-4">
            {availablePlans?.map((plan: ReadingPlan) => {
              const isCurrentPlan = plan.id === currentPlan?.id;
              const isSelected = selectedPlanId === plan.id;
              const isChanging = changePlanMutation.isPending && isSelected;
              
              return (
                <Card 
                  key={plan.id} 
                  className={`transition-all ${
                    isCurrentPlan 
                      ? 'border-primary/20 bg-primary/5' 
                      : 'hover:border-primary/30'
                  }`}
                >
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="space-y-3 flex-1">
                        <div className="flex items-center gap-2">
                          <BookOpen className="h-5 w-5 text-primary" />
                          <h3 className="text-lg font-semibold text-foreground">
                            {plan.name}
                          </h3>
                          {isCurrentPlan && (
                            <Badge variant="default">Actuel</Badge>
                          )}
                        </div>
                        
                        {plan.description && (
                          <p className="text-muted-foreground">
                            {plan.description}
                          </p>
                        )}
                        
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            {plan.duration_days} jours
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            Environ {Math.ceil(plan.duration_days / 30)} mois
                          </div>
                        </div>
                      </div>
                      
                      <div className="ml-4">
                        {isCurrentPlan ? (
                          <Badge variant="outline" className="border-primary text-primary">
                            Sélectionné
                          </Badge>
                        ) : (
                          <Button
                            onClick={() => handleChangePlan(plan.id)}
                            disabled={isChanging || changePlanMutation.isPending}
                            variant="outline"
                            size="sm"
                          >
                            {isChanging ? (
                              <div className="flex items-center gap-2">
                                <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-primary"></div>
                                Changement...
                              </div>
                            ) : (
                              'Sélectionner'
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Message si aucun plan disponible */}
        {availablePlans?.length === 0 && (
          <Card>
            <CardContent className="p-6 text-center">
              <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Aucun plan disponible
              </h3>
              <p className="text-muted-foreground">
                Aucun plan de lecture n'est actuellement disponible.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default ReadingPlanManagement;