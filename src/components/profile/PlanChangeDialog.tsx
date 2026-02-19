import React, { useState } from 'react';
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle, 
  AlertDialogTrigger 
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Settings, AlertTriangle } from 'lucide-react';
import PlanSelector from '@/components/ui/PlanSelector';
import { changePlan, getUserPlan } from '@/services/readingPlan/planService';
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';
import { ReadingPlan } from '@/types/supabase';
import { toast } from 'sonner';
import { useQuery, useQueryClient } from '@tanstack/react-query';

interface PlanChangeDialogProps {
  currentPlan?: ReadingPlan;
  onPlanChanged?: () => void;
}

const PlanChangeDialog: React.FC<PlanChangeDialogProps> = ({ 
  currentPlan, 
  onPlanChanged 
}) => {
  const [selectedPlanId, setSelectedPlanId] = useState<string>(currentPlan?.id || '');
  const [isChanging, setIsChanging] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const queryClient = useQueryClient();
  const { user } = useOptimizedAuth();

  const handlePlanChange = async () => {
    if (!selectedPlanId || selectedPlanId === currentPlan?.id) {
      toast.error("Veuillez sélectionner un plan différent");
      return;
    }

    setIsChanging(true);
    try {
      const result = await changePlan(selectedPlanId);
      if (result.success) {
        // Invalider les caches pour forcer le rechargement
        await queryClient.invalidateQueries({ queryKey: ['user-plan'] });
        await queryClient.invalidateQueries({ queryKey: ['reading-plan'] });
        await queryClient.invalidateQueries({ queryKey: ['user-progress'] });
        await queryClient.invalidateQueries({ queryKey: ['user-plan-duration'] });
        
        setIsOpen(false);
        onPlanChanged?.();
        
        // Recharger la page pour s'assurer que tout est à jour
        window.location.reload();
      }
    } catch (error) {
      console.error('Erreur lors du changement de plan:', error);
      toast.error("Une erreur est survenue lors du changement de plan");
    } finally {
      setIsChanging(false);
    }
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Settings className="h-4 w-4" />
          Changer de plan
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="sm:max-w-[500px]">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Changer de plan de lecture
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <p>
              <strong>⚠️ Attention :</strong> Changer de plan supprimera définitivement :
            </p>
            <ul className="list-disc list-inside space-y-1 ml-4 text-sm">
              <li>Toute votre progression actuelle</li>
              <li>Tous vos badges obtenus</li>
              <li>Votre historique de lecture</li>
            </ul>
            <p>
              Vous repartirez au jour 1 avec le nouveau plan sélectionné.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        
        <div className="py-4">
          <h4 className="text-sm font-medium mb-3">Sélectionnez votre nouveau plan :</h4>
          <PlanSelector
            selectedPlanId={selectedPlanId}
            onPlanSelect={setSelectedPlanId}
            disabled={isChanging}
          />
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isChanging}>
            Annuler
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handlePlanChange}
            disabled={isChanging || !selectedPlanId || selectedPlanId === currentPlan?.id}
            className="bg-red-600 hover:bg-red-700"
          >
            {isChanging ? "Changement en cours..." : "Confirmer le changement"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default PlanChangeDialog;