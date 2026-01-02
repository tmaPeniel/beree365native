import React, { useState } from 'react';
import { ArrowLeft, BookOpen, Calendar, CheckCircle, Clock, RotateCcw, Trash2, BookMarked } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useAuth } from '@/hooks/useAuth';
import { getAvailablePlans, getUserPlan, changePlan } from '@/services/readingPlan/planService';
import { supabase } from '@/integrations/supabase/client';
import PlanDetailsDialog from '@/components/profile/PlanDetailsDialog';
import { toast } from 'sonner';
import type { ReadingPlan } from '@/types/supabase';

/**
 * Page de gestion des plans de lecture
 */
const ReadingPlanManagement = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [selectedPlanForDetails, setSelectedPlanForDetails] = useState<ReadingPlan | null>(null);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  // Récupérer le plan actuel de l'utilisateur
  const { data: currentPlan, isLoading: currentPlanLoading } = useQuery({
    queryKey: ['user-plan', user?.id],
    queryFn: () => user ? getUserPlan(user.id) : null,
    enabled: !!user,
  });

  // Récupérer tous les plans disponibles avec le nombre de passages
  const { data: availablePlans, isLoading: plansLoading } = useQuery({
    queryKey: ['available-plans'],
    queryFn: getAvailablePlans,
  });

  // Récupérer le nombre de passages pour chaque plan
  const { data: passageCounts } = useQuery({
    queryKey: ['passage-counts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('reading_plan_chapters')
        .select('plan_id');
      
      if (error) throw error;
      
      // Compter les passages par plan_id
      const counts = data.reduce((acc, chapter) => {
        acc[chapter.plan_id] = (acc[chapter.plan_id] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      return counts;
    },
  });

  // Mutation pour changer de plan
  const changePlanMutation = useMutation({
    mutationFn: changePlan,
    onSuccess: () => {
      toast.success('Plan de lecture changé avec succès !');
      queryClient.invalidateQueries({ queryKey: ['user-plan'] });
      queryClient.invalidateQueries({ queryKey: ['user-progress'] });
      queryClient.invalidateQueries({ queryKey: ['user-plan-duration'] });
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

  const handlePlanCardClick = (plan: ReadingPlan) => {
    setSelectedPlanForDetails(plan);
    setIsDetailsDialogOpen(true);
  };

  const handleResetPlan = async () => {
    if (!user) return;
    
    setIsResetting(true);
    try {
      // Supprimer la progression utilisateur
      const { error: progressError } = await supabase
        .from('user_progress')
        .delete()
        .eq('user_id', user.id);

      if (progressError) {
        throw progressError;
      }

      // Supprimer les badges utilisateur
      const { error: badgesError } = await supabase
        .from('user_badges')
        .delete()
        .eq('user_id', user.id);

      if (badgesError) {
        throw badgesError;
      }

      // Remettre le profil au jour 1
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ 
          current_day_number: 1,
          start_date: new Date().toISOString().split('T')[0] 
        })
        .eq('id', user.id);

      if (profileError) {
        throw profileError;
      }

      toast.success('Plan de lecture réinitialisé avec succès !');
      queryClient.invalidateQueries({ queryKey: ['user-plan'] });
      queryClient.invalidateQueries({ queryKey: ['user-progress'] });
      queryClient.invalidateQueries({ queryKey: ['user-badges'] });
      queryClient.invalidateQueries({ queryKey: ['userStats'] });
      queryClient.invalidateQueries({ queryKey: ['user-plan-duration'] });
    } catch (error) {
      console.error('Erreur lors de la réinitialisation:', error);
      toast.error('Erreur lors de la réinitialisation du plan');
    } finally {
      setIsResetting(false);
    }
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
                    <BookMarked className="h-4 w-4" />
                    {passageCounts?.[currentPlan.id] || 0} passages
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
          
          <div className="grid gap-4 sm:grid-cols-2">
            {availablePlans?.map((plan: ReadingPlan) => {
              const isCurrentPlan = plan.id === currentPlan?.id;
              
              return (
                <Card 
                  key={plan.id} 
                  className={`cursor-pointer transition-all hover:shadow-md ${
                    isCurrentPlan 
                      ? 'border-primary/20 bg-primary/5' 
                      : 'hover:border-primary/30 hover:scale-[1.02]'
                  }`}
                  onClick={() => handlePlanCardClick(plan)}
                >
                  <CardContent className="p-6">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <BookOpen className="h-5 w-5 text-primary" />
                          <h3 className="text-lg font-semibold text-foreground">
                            {plan.name}
                          </h3>
                        </div>
                        {isCurrentPlan && (
                          <Badge variant="default" className="flex items-center gap-1">
                            <CheckCircle className="h-3 w-3" />
                            Actuel
                          </Badge>
                        )}
                      </div>
                      
                      {plan.description && (
                        <p className="text-muted-foreground text-sm line-clamp-2">
                          {plan.description}
                        </p>
                      )}
                      
                      <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {plan.duration_days} jours
                        </div>
                        <div className="flex items-center gap-1">
                          <BookMarked className="h-4 w-4" />
                          {passageCounts?.[plan.id] || 0} passages
                        </div>
                      </div>
                      
                      <div className="pt-2">
                        <Button 
                          variant="secondary" 
                          size="sm" 
                          className="w-full"
                          onClick={(e) => {
                            e.stopPropagation();
                            // Pour tous les plans, on ouvre juste les détails
                            handlePlanCardClick(plan);
                          }}
                        >
                          {isCurrentPlan ? 'Voir les détails' : 'Voir les détails'}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Réinitialiser le plan */}
        {currentPlan && (
          <div className="pt-8 border-t border-border">
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-foreground">
                Actions avancées
              </h2>
              
              <Card className="border-destructive/20">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="p-2 bg-destructive/10 rounded-lg">
                      <Trash2 className="h-5 w-5 text-destructive" />
                    </div>
                    <div className="flex-1 space-y-3">
                      <div>
                        <h3 className="font-semibold text-foreground">
                          Réinitialiser le plan de lecture
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          Supprime toute votre progression, vos badges et remet le compteur au jour 1. 
                          Cette action est irréversible.
                        </p>
                      </div>
                      
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button 
                            variant="destructive" 
                            size="sm"
                            disabled={isResetting}
                          >
                            {isResetting ? (
                              <div className="flex items-center gap-2">
                                <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-destructive-foreground"></div>
                                Réinitialisation...
                              </div>
                            ) : (
                              <>
                                <RotateCcw className="h-4 w-4 mr-2" />
                                Réinitialiser
                              </>
                            )}
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Confirmer la réinitialisation</AlertDialogTitle>
                            <AlertDialogDescription>
                              Êtes-vous sûr de vouloir réinitialiser votre plan de lecture ? 
                              Cette action supprimera définitivement :
                              <br />
                              • Toute votre progression de lecture
                              <br />
                              • Tous vos badges obtenus
                              <br />
                              • Votre historique de lecture
                              <br /><br />
                              Vous repartirez au jour 1. Cette action ne peut pas être annulée.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Annuler</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={handleResetPlan}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Oui, réinitialiser
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

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

        {/* Dialog des détails */}
        <PlanDetailsDialog
          plan={selectedPlanForDetails}
          isOpen={isDetailsDialogOpen}
          onClose={() => {
            setIsDetailsDialogOpen(false);
            setSelectedPlanForDetails(null);
          }}
          onSelectPlan={handleChangePlan}
          isCurrentPlan={selectedPlanForDetails?.id === currentPlan?.id}
          isChanging={changePlanMutation.isPending && selectedPlanId === selectedPlanForDetails?.id}
          passageCount={selectedPlanForDetails ? (passageCounts?.[selectedPlanForDetails.id] || 0) : 0}
        />
      </div>
    </div>
  );
};

export default ReadingPlanManagement;