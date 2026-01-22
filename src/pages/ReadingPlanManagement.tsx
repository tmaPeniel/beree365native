import React, { useState } from 'react';
import { ArrowLeft, BookOpen, Calendar, CheckCircle, RotateCcw, Trash2, BookMarked, ChevronDown } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useAuth } from '@/hooks/useAuth';
import { getAvailablePlans, getUserPlan, changePlan } from '@/services/readingPlan/planService';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { ReadingPlan } from '@/types/supabase';
import { getPlanImage } from '@/assets/planImages';

// Format plan duration as "06", "12", etc.
const formatPlanDuration = (plan: ReadingPlan): string => {
  const months = Math.round(plan.duration_days / 30);
  return months < 10 ? `0${months}` : `${months}`;
};

// Extract plan type (Canonique or Chronologique)
const getPlanType = (plan: ReadingPlan): string => {
  if (plan.name.toLowerCase().includes('canonique')) return 'Canonique';
  if (plan.name.toLowerCase().includes('chronologique')) return 'Chronologique';
  return plan.name;
};

const ReadingPlanManagement = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [expandedPlanId, setExpandedPlanId] = useState<string | null>(null);
  const [isResetting, setIsResetting] = useState(false);

  const { data: currentPlan, isLoading: currentPlanLoading } = useQuery({
    queryKey: ['user-plan', user?.id],
    queryFn: () => user ? getUserPlan(user.id) : null,
    enabled: !!user,
  });

  const { data: availablePlans, isLoading: plansLoading } = useQuery({
    queryKey: ['available-plans'],
    queryFn: getAvailablePlans,
  });

  const { data: passageCounts } = useQuery({
    queryKey: ['passage-counts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('reading_plan_chapters')
        .select('plan_id');
      
      if (error) throw error;
      
      const counts = data.reduce((acc, chapter) => {
        acc[chapter.plan_id] = (acc[chapter.plan_id] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      return counts;
    },
  });

  const changePlanMutation = useMutation({
    mutationFn: changePlan,
    onSuccess: () => {
      toast.success('Plan de lecture changé avec succès !');
      queryClient.invalidateQueries({ queryKey: ['user-plan'] });
      queryClient.invalidateQueries({ queryKey: ['user-progress'] });
      queryClient.invalidateQueries({ queryKey: ['user-plan-duration'] });
      setExpandedPlanId(null);
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
    changePlanMutation.mutate(planId);
  };

  const togglePlan = (planId: string) => {
    setExpandedPlanId(expandedPlanId === planId ? null : planId);
  };

  const handleResetPlan = async () => {
    if (!user) return;
    
    setIsResetting(true);
    try {
      const { error: progressError } = await supabase
        .from('user_progress')
        .delete()
        .eq('user_id', user.id);

      if (progressError) throw progressError;

      const { error: badgesError } = await supabase
        .from('user_badges')
        .delete()
        .eq('user_id', user.id);

      if (badgesError) throw badgesError;

      const { error: profileError } = await supabase
        .from('profiles')
        .update({ 
          current_day_number: 1,
          start_date: new Date().toISOString().split('T')[0] 
        })
        .eq('id', user.id);

      if (profileError) throw profileError;

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

  // Get expanded plan details
  const expandedPlan = expandedPlanId 
    ? availablePlans?.find((p: ReadingPlan) => p.id === expandedPlanId) 
    : null;

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
      <div className="px-4 py-6 space-y-6">
        
        {/* Section: Mon plan actuel */}
        {currentPlan && (
          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">Mon plan actuel</h2>
            <Card className="overflow-hidden border-primary/20">
              <div className="relative h-28">
                {getPlanImage(currentPlan.id) ? (
                  <img 
                    src={getPlanImage(currentPlan.id)} 
                    alt={currentPlan.name}
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/30 to-primary/50" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
                <Badge className="absolute top-3 right-3 bg-primary text-primary-foreground">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Actif
                </Badge>
                <div className="absolute bottom-3 left-4 right-4">
                  <h3 className="text-lg font-bold text-white">{currentPlan.name}</h3>
                  <div className="flex gap-4 text-sm text-white/80 mt-1">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      {currentPlan.duration_days} jours
                    </span>
                    <span className="flex items-center gap-1">
                      <BookMarked className="h-3.5 w-3.5" />
                      {passageCounts?.[currentPlan.id] || 0} passages
                    </span>
                  </div>
                </div>
              </div>
            </Card>
          </section>
        )}

        {/* Section: Changer de plan */}
        <section className="space-y-3">
          <h2 className="text-base font-semibold text-foreground">Changer de plan</h2>
          
          {/* Grille des plans */}
          <div className="grid grid-cols-2 gap-3">
            {availablePlans?.map((plan: ReadingPlan) => {
              const isCurrentPlan = plan.id === currentPlan?.id;
              const isExpanded = expandedPlanId === plan.id;
              const planImage = getPlanImage(plan.id);
              
              return (
                <div 
                  key={plan.id}
                  onClick={() => togglePlan(plan.id)}
                  className={`relative aspect-[3/2] rounded-xl overflow-hidden cursor-pointer transition-all duration-300 ${
                    isExpanded ? 'ring-2 ring-primary scale-[0.98]' : 'hover:scale-[1.02]'
                  } ${isCurrentPlan ? 'opacity-60' : ''}`}
                >
                  {/* Image de fond */}
                  {planImage ? (
                    <img 
                      src={planImage} 
                      alt={plan.name}
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-primary/40 flex items-center justify-center">
                      <BookOpen className="h-10 w-10 text-primary/60" />
                    </div>
                  )}
                  
                  {/* Overlay gradient */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
                  
                  {/* Badge actuel */}
                  {isCurrentPlan && (
                    <Badge className="absolute top-2 right-2 bg-primary/80 text-primary-foreground text-xs">
                      Actuel
                    </Badge>
                  )}
                  
                  {/* Indicateur expansion */}
                  <div className={`absolute top-2 left-2 p-1 rounded-full bg-white/20 backdrop-blur-sm transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}>
                    <ChevronDown className="h-3.5 w-3.5 text-white" />
                  </div>
                  
                  {/* Contenu texte */}
                  <div className="absolute inset-0 flex flex-col justify-end p-3">
                    <span className="text-3xl font-bold text-white leading-none">
                      {formatPlanDuration(plan)}
                    </span>
                    <span className="text-sm text-white/90 font-medium mt-0.5">
                      {getPlanType(plan)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Contenu expansible PLEINE LARGEUR */}
          {expandedPlan && (
            <div className="p-4 bg-card rounded-xl border border-border space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
              {/* Nom complet */}
              <h3 className="font-semibold text-foreground">{expandedPlan.name}</h3>
              
              {/* Description */}
              {expandedPlan.description && (
                <p className="text-sm text-muted-foreground">{expandedPlan.description}</p>
              )}
              
              {/* Stats */}
              <div className="flex gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <Calendar className="h-4 w-4" />
                  {expandedPlan.duration_days} jours
                </div>
                <div className="flex items-center gap-1.5">
                  <BookMarked className="h-4 w-4" />
                  {passageCounts?.[expandedPlan.id] || 0} passages
                </div>
              </div>
              
              {/* Bouton sélectionner */}
              {expandedPlan.id !== currentPlan?.id ? (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button 
                      className="w-full"
                      size="sm"
                      disabled={changePlanMutation.isPending}
                    >
                      {changePlanMutation.isPending ? 'Changement...' : 'Sélectionner ce plan'}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Changer de plan de lecture ?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Cette action supprimera votre progression actuelle et réinitialisera vos badges. 
                        Vous repartirez au jour 1 du nouveau plan.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Annuler</AlertDialogCancel>
                      <AlertDialogAction onClick={() => handleChangePlan(expandedPlan.id)}>
                        Confirmer
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              ) : (
                <div className="flex items-center gap-2 text-sm text-primary">
                  <CheckCircle className="h-4 w-4" />
                  Plan actuellement sélectionné
                </div>
              )}
            </div>
          )}
        </section>

        {/* Avertissement */}
        <Alert>
          <AlertDescription className="text-sm">
            <strong>Note :</strong> Changer de plan supprime votre progression et vos badges.
          </AlertDescription>
        </Alert>

        {/* Réinitialiser le plan */}
        {currentPlan && (
          <section className="pt-2">
            <Card className="border-destructive/20">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-destructive/10 rounded-lg">
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </div>
                  <div className="flex-1 space-y-3">
                    <div>
                      <h3 className="font-semibold text-foreground text-sm">
                        Réinitialiser le plan
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        Remet le compteur au jour 1 et supprime votre progression.
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
                              <div className="animate-spin rounded-full h-3 w-3 border-t-2 border-b-2 border-destructive-foreground"></div>
                              Réinitialisation...
                            </div>
                          ) : (
                            <>
                              <RotateCcw className="h-3 w-3 mr-1" />
                              Réinitialiser
                            </>
                          )}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Confirmer la réinitialisation</AlertDialogTitle>
                          <AlertDialogDescription>
                            Cette action supprimera définitivement votre progression, vos badges et votre historique. 
                            Vous repartirez au jour 1.
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
          </section>
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
      </div>
    </div>
  );
};

export default ReadingPlanManagement;
