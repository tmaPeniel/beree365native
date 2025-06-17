
/**
 * Composant principal pour afficher et gérer le plan de lecture du jour
 * 
 * Ce composant permet à l'utilisateur de :
 * - Voir les passages à lire pour un jour donné
 * - Marquer/démarquer les passages comme lus
 * - Suivre sa progression en temps réel
 * 
 * Optimisations incluses :
 * - Cache intelligent avec React Query
 * - Mises à jour optimistes pour une meilleure UX
 * - Gestion d'état local pour les indicateurs de chargement
 */

import React, { useCallback, useMemo, useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Check, Loader2 } from 'lucide-react';
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';
import { getReadingPlanForDay } from '@/services/readingPlan';
import { getCachedUserProgressForDay, optimizedToggleChapterStatus } from '@/services/readingPlan/optimizedProgressService';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

// Types pour une meilleure lisibilité du code
interface ReadingItem {
  id: string;
  reference: string;
  completed: boolean;
}

interface OptimizedReadingPlanProps {
  dayNumber: number;
}

/**
 * Composant de plan de lecture optimisé
 * Utilise React.memo pour éviter les re-rendus inutiles
 */
const OptimizedReadingPlan = React.memo<OptimizedReadingPlanProps>(({ dayNumber }) => {
  // Hooks d'authentification et de gestion d'état
  const { user, triggerProgressUpdate } = useOptimizedAuth();
  const [processingIds, setProcessingIds] = useState<string[]>([]);
  const queryClient = useQueryClient();

  // Requête pour récupérer les chapitres du jour
  // Cache persistant pour éviter les rechargements inutiles
  const { data: chaptersData = [] } = useQuery({
    queryKey: ['reading-plan-chapters', dayNumber],
    queryFn: () => getReadingPlanForDay(dayNumber),
    staleTime: 60 * 60 * 1000, // Cache valide pendant 1 heure
    gcTime: 2 * 60 * 60 * 1000, // Garde en mémoire pendant 2 heures
    refetchOnMount: false, // Ne pas recharger automatiquement au montage
    refetchOnWindowFocus: false, // Ne pas recharger au focus de fenêtre
    enabled: !!dayNumber // Seulement si dayNumber est défini
  });

  // Requête pour récupérer la progression utilisateur
  // Cache optimisé pour préserver l'état des cases cochées
  const { data: progressData = [], isLoading } = useQuery({
    queryKey: ['user-progress-optimized', user?.id, dayNumber],
    queryFn: () => user ? getCachedUserProgressForDay(user.id, dayNumber) : [],
    staleTime: 30 * 60 * 1000, // Cache valide pendant 30 minutes
    gcTime: 60 * 60 * 1000, // Garde en mémoire pendant 1 heure
    refetchOnMount: false, // Préserver les données en cache au montage
    refetchOnWindowFocus: false, // Ne pas recharger au focus
    enabled: !!user && !!dayNumber // Seulement si utilisateur connecté et dayNumber défini
  });

  // Calcul optimisé des éléments de lecture avec mémorisation
  // useMemo évite les recalculs inutiles à chaque render
  const readingItems = useMemo(() => {
    if (!chaptersData.length) return [];
    
    return chaptersData.map(chapter => {
      const progressItem = progressData.find(p => p.chapter_id === chapter.id);
      return {
        id: chapter.id,
        reference: chapter.reference,
        completed: progressItem ? progressItem.status === 'completed' : false
      };
    });
  }, [chaptersData, progressData]);

  // Gestionnaire optimisé pour marquer/démarquer un passage comme lu
  // useCallback évite la recréation de la fonction à chaque render
  const handleToggleRead = useCallback(async (event: React.MouseEvent, id: string) => {
    // Empêcher la propagation d'événements
    event.preventDefault();
    event.stopPropagation();
    
    // Vérifier que l'utilisateur est connecté
    if (!user) {
      toast.error("Vous devez être connecté pour modifier le statut de lecture");
      return;
    }
    
    // Trouver l'élément à modifier
    const item = readingItems.find(item => item.id === id);
    if (!item) return;
    
    try {
      // Ajouter l'ID à la liste des éléments en cours de traitement
      setProcessingIds(prev => [...prev, id]);
      
      // Appeler le service pour mettre à jour le statut
      const result = await optimizedToggleChapterStatus(
        user.id, 
        id, 
        item.completed ? 'completed' : 'pending',
        dayNumber
      );
      
      if (result.success) {
        // Mise à jour optimiste du cache pour une UX instantanée
        queryClient.setQueryData(['user-progress-optimized', user.id, dayNumber], (oldData: any[]) => {
          if (!oldData) return oldData;
          
          const existingIndex = oldData.findIndex(item => item.chapter_id === id);
          const newStatus = item.completed ? 'pending' : 'completed';
          
          if (existingIndex >= 0) {
            // Mettre à jour l'entrée existante
            const updatedData = [...oldData];
            updatedData[existingIndex] = {
              ...updatedData[existingIndex],
              status: newStatus,
              completed_at: newStatus === 'completed' ? new Date().toISOString() : null
            };
            return updatedData;
          } else {
            // Créer une nouvelle entrée
            return [...oldData, {
              id: `temp-${id}`,
              user_id: user.id,
              chapter_id: id,
              status: newStatus,
              completed_at: newStatus === 'completed' ? new Date().toISOString() : null,
              reading_plan_chapters: chaptersData.find(c => c.id === id)
            }];
          }
        });
        
        // Invalider le cache global pour la synchronisation
        queryClient.invalidateQueries({ 
          queryKey: ['optimized-reading-plan-data', user.id],
          refetchType: 'none' // Ne pas refetch immédiatement
        });
        
        // Déclencher la mise à jour globale de progression
        triggerProgressUpdate();
      }
    } catch (error) {
      console.error(`Erreur lors de la mise à jour du chapitre ${id}:`, error);
      toast.error("Une erreur est survenue lors de la mise à jour");
      
      // En cas d'erreur, invalider le cache pour récupérer l'état correct
      queryClient.invalidateQueries({ 
        queryKey: ['user-progress-optimized', user.id, dayNumber] 
      });
    } finally {
      // Retirer l'ID de la liste des éléments en cours de traitement
      setProcessingIds(prev => prev.filter(itemId => itemId !== id));
    }
  }, [user, readingItems, dayNumber, queryClient, triggerProgressUpdate, chaptersData]);

  // Composant de ligne optimisé avec React.memo pour éviter les re-rendus
  const ReadingItemRow = React.memo<{
    item: ReadingItem;
    isProcessing: boolean;
    onToggle: (event: React.MouseEvent) => void;
  }>(({ item, isProcessing, onToggle }) => (
    <li className="flex items-center">
      <button
        type="button"
        onClick={onToggle}
        disabled={isProcessing}
        className={`flex items-center w-full text-left transition-all ${
          item.completed ? 'text-gray-400' : 'text-gray-800'
        } ${isProcessing ? 'opacity-70' : 'hover:bg-gray-50 rounded p-1'}`}
      >
        {/* Indicateur visuel de statut avec animation de chargement */}
        <div className={`h-5 w-5 rounded mr-3 flex items-center justify-center transition-colors ${
          item.completed ? 'bg-green-500' : 'border-2 border-green-300 hover:border-green-400'
        }`}>
          {isProcessing ? (
            <Loader2 className="h-3 w-3 text-white animate-spin" />
          ) : (
            item.completed && <Check className="h-3 w-3 text-white" />
          )}
        </div>
        {/* Référence du passage avec style conditionnel */}
        <span className={item.completed ? 'line-through' : ''}>
          {item.reference}
        </span>
      </button>
    </li>
  ));

  // État de chargement avec indicateur visuel
  if (isLoading) {
    return (
      <Card className="bg-white border-none shadow-sm">
        <CardContent className="p-6">
          <div className="flex justify-center items-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-green-500"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Rendu principal du composant
  return (
    <Card className="bg-white border-none shadow-sm">
      <CardContent className="p-6">
        {/* En-tête avec titre et indicateur de jour */}
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Aujourd'hui</h2>
          <span className="text-sm bg-green-100 text-green-700 py-1 px-3 rounded-full">
            Jour {dayNumber}/365
          </span>
        </div>
        
        {/* Section des passages à lire */}
        <div className="mb-6">
          <h3 className="font-medium text-gray-700 mb-3">Passages du jour</h3>
          {readingItems.length > 0 ? (
            <ul className="space-y-2">
              {readingItems.map((item) => (
                <ReadingItemRow
                  key={item.id}
                  item={item}
                  isProcessing={processingIds.includes(item.id)}
                  onToggle={(event) => handleToggleRead(event, item.id)}
                />
              ))}
            </ul>
          ) : (
            <p className="text-center text-gray-500 my-4">
              Aucun passage trouvé pour ce jour
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
});

// Définir le nom d'affichage pour le débogage
OptimizedReadingPlan.displayName = 'OptimizedReadingPlan';

export default OptimizedReadingPlan;
