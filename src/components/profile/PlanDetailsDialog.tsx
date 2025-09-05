import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { BookOpen, Calendar, Clock, CheckCircle } from 'lucide-react';
import type { ReadingPlan } from '@/types/supabase';

interface PlanDetailsDialogProps {
  plan: ReadingPlan | null;
  isOpen: boolean;
  onClose: () => void;
  onSelectPlan: (planId: string) => void;
  isCurrentPlan: boolean;
  isChanging: boolean;
}

const PlanDetailsDialog: React.FC<PlanDetailsDialogProps> = ({
  plan,
  isOpen,
  onClose,
  onSelectPlan,
  isCurrentPlan,
  isChanging,
}) => {
  const [showConfirmation, setShowConfirmation] = useState(false);

  if (!plan) return null;

  const handleConfirmPlanChange = () => {
    onSelectPlan(plan.id);
    setShowConfirmation(false);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            Détails du plan
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Nom et statut */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold text-foreground">
                {plan.name}
              </h3>
              {isCurrentPlan && (
                <Badge variant="default" className="flex items-center gap-1">
                  <CheckCircle className="h-3 w-3" />
                  Actuel
                </Badge>
              )}
            </div>
            
            {plan.description && (
              <p className="text-muted-foreground text-sm">
                {plan.description}
              </p>
            )}
          </div>

          {/* Informations détaillées */}
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">Durée totale</span>
              </div>
              <span className="text-sm text-muted-foreground">
                {plan.duration_days} jours
              </span>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">Durée estimée</span>
              </div>
              <span className="text-sm text-muted-foreground">
                Environ {Math.ceil(plan.duration_days / 30)} mois
              </span>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
              <div className="flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">Lectures par jour</span>
              </div>
              <span className="text-sm text-muted-foreground">
                Variable selon le jour
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-3 pt-4">
            {isCurrentPlan ? (
              <Button variant="outline" disabled className="w-full">
                <CheckCircle className="h-4 w-4 mr-2" />
                Plan actuellement sélectionné
              </Button>
            ) : (
              <AlertDialog open={showConfirmation} onOpenChange={setShowConfirmation}>
                <AlertDialogTrigger asChild>
                  <Button 
                    disabled={isChanging}
                    className="w-full"
                  >
                    {isChanging ? (
                      <div className="flex items-center gap-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-primary-foreground"></div>
                        Changement en cours...
                      </div>
                    ) : (
                      'Sélectionner ce plan'
                    )}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Confirmer le changement de plan</AlertDialogTitle>
                    <AlertDialogDescription>
                      Êtes-vous sûr de vouloir changer pour le plan "{plan.name}" ?
                      <br /><br />
                      <strong>Attention :</strong> Cette action supprimera définitivement :
                      <br />
                      • Toute votre progression de lecture actuelle
                      <br />
                      • Tous vos badges obtenus
                      <br />
                      • Votre historique de lecture
                      <br /><br />
                      Vous repartirez au jour 1 avec le nouveau plan. Cette action ne peut pas être annulée.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Annuler</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleConfirmPlanChange}
                      className="bg-primary text-primary-foreground hover:bg-primary/90"
                    >
                      Oui, changer de plan
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
            
            <Button variant="outline" onClick={onClose} className="w-full">
              Fermer
            </Button>
          </div>

          {!isCurrentPlan && (
            <div className="p-3 bg-warning/10 border border-warning/20 rounded-lg">
              <p className="text-xs text-warning-foreground">
                <strong>Attention :</strong> Changer de plan supprimera votre progression actuelle et réinitialisera vos badges.
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PlanDetailsDialog;