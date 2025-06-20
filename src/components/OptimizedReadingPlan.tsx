
/**
 * Composant principal pour afficher et gérer le plan de lecture du jour
 * VERSION CORRIGÉE - Affichage réactif avec rafraîchissement automatique
 */

import React, { useCallback, useMemo, useState, useEffect } from 'react';
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
 * Composant de plan de lecture optimisé avec rafraîchissement automatique
 */
const OptimizedReadingPlan = React.memo<OptimizedReadingPlanProps>(({ dayNumber }) => {
  // Hooks d'authentification et de gestion d'état
  const { user, triggerProgressUpdate } = useOptimizedAuth();
  const [processingIds, setProcessingIds] = useState<string[]>([]);
  const [lastUpdateTime, setLastUpdateTime] = useState<Date | null>(null);
  const queryClient = useQueryClient();

  // Configuration React Query CORRIGÉE - plus réactive avec rafraîchissement automatique
  const { data: chaptersData = [] } = useQuery({
    queryKey: ['reading-plan-chapters', dayNumber],
    queryFn: () => getReadingPlanForDay(dayNumber),
    staleTime: 30 * 1000, // 30 secondes
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    enabled: !!dayNumber,
    refetchInterval: 60 * 1000 // AJOUT : Rafraîchissement auto toutes les 60 secondes
  });

  // Requête pour la progression utilisateur avec rafraîchissement automatique
  const { data: progressData = [], isLoading, refetch: refetchProgress } = useQuery({
    queryKey: ['user-progress-optimized', user?.id, dayNumber],
    queryFn: () => user ? getCachedUserProgressForDay(user.id, dayNumber) : [],
    staleTime: 15 * 1000, // 15 secondes
    gcTime: 2 * 60 * 1000, // 2 minutes
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    enabled: !!user && !!dayNumber,
    refetchInterval: 2 * 1000 // AJOUT : Rafraîchissement auto toutes les 30 secondes
  });

  // AJOUT : Rafraîchissement automatique après chaque mise à jour
  useEffect(() => {
    if (lastUpdateTime) {
      const timer = setTimeout(() => {
        refetchProgress();
      }, 2000); // Rafraîchir 2 secondes après une mise à jour

      return () => clearTimeout(timer);
    }
  }, [lastUpdateTime, refetchProgress]);

  // Calcul optimisé des éléments de lecture
  const readingItems = useMemo(() => {
    if (!chaptersData.length) return [];
    
    return chaptersData.map(chapter => {
      const progressItem = progressData.find(p => p.chapter_id === chapter.id);
      const completed = progressItem ? progressItem.status === 'completed' : false;
      
      return {
        id: chapter.id,
        reference: chapter.reference,
        completed
      };
    });
  }, [chaptersData, progressData]);

  // Gestionnaire CORRIGÉ pour marquer/démarquer un passage
  const handleToggleRead = useCallback(async (event: React.MouseEvent, id: string) => {
    event.preventDefault();
    event.stopPropagation();
    
    if (!user) {
      toast.error("Vous devez être connecté pour modifier le statut de lecture");
      return;
    }
    
    const item = readingItems.find(item => item.id === id);
    if (!item) return;
    
    try {
      setProcessingIds(prev => [...prev, id]);
      
      const result = await optimizedToggleChapterStatus(
        user.id, 
        id, 
        item.completed ? 'completed' : 'pending',
        dayNumber
      );
      
      if (result.success) {
        // Mise à jour optimiste AMÉLIORÉE
        queryClient.setQueryData(['user-progress-optimized', user.id, dayNumber], (oldData: any[]) => {
          if (!oldData) return oldData;
          
          const existingIndex = oldData.findIndex(item => item.chapter_id === id);
          const newStatus = item.completed ? 'pending' : 'completed';
          
          if (existingIndex >= 0) {
            const updatedData = [...oldData];
            updatedData[existingIndex] = {
              ...updatedData[existingIndex],
              status: newStatus,
              completed_at: newStatus === 'completed' ? new Date().toISOString() : null
            };
            return updatedData;
          } else {
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
        
        // Invalidation CORRIGÉE avec refetch actif
        queryClient.invalidateQueries({ 
          queryKey: ['optimized-reading-plan-data', user.id],
          refetchType: 'active'
        });
        
        // Déclencher la mise à jour globale
        triggerProgressUpdate();
        setLastUpdateTime(new Date());
        
        // AJOUT : Rafraîchissement automatique après succès
        setTimeout(() => {
          refetchProgress();
        }, 1000);
        
      } else {
        throw new Error(result.error || 'Erreur lors de la mise à jour');
      }
    } catch (error) {
      console.error(`❌ [ERROR] Toggling chapter ${id}:`, error);
      toast.error("Une erreur est survenue lors de la mise à jour");
      
      // Rollback en cas d'erreur avec rafraîchissement
      queryClient.invalidateQueries({ 
        queryKey: ['user-progress-optimized', user.id, dayNumber],
        refetchType: 'active'
      });
      
      setTimeout(() => {
        refetchProgress();
      }, 1000);
    } finally {
      setProcessingIds(prev => prev.filter(itemId => itemId !== id));
    }
  }, [user, readingItems, dayNumber, queryClient, triggerProgressUpdate, chaptersData, refetchProgress]);

  // Composant de ligne optimisé
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
        <div className={`h-5 w-5 rounded mr-3 flex items-center justify-center transition-colors ${
          item.completed ? 'bg-green-500' : 'border-2 border-green-300 hover:border-green-400'
        }`}>
          {isProcessing ? (
            <Loader2 className="h-3 w-3 text-white animate-spin" />
          ) : (
            item.completed && <Check className="h-3 w-3 text-white" />
          )}
        </div>
        <span className={item.completed ? 'line-through' : ''}>
          {item.reference}
        </span>
      </button>
    </li>
  ));

  ReadingItemRow.displayName = 'ReadingItemRow';

  // État de chargement
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
        {/* En-tête avec indicateur de rafraîchissement automatique */}
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Aujourd'hui</h2>
          <div className="flex items-center gap-2">
            <span className="text-sm bg-green-100 text-green-700 py-1 px-3 rounded-full">
              Jour {dayNumber}/365
            </span>
            {/* AJOUT : Indicateur de rafraîchissement automatique */}
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <div className="h-2 w-2 bg-green-400 rounded-full animate-pulse"></div>
              <span>Auto</span>
            </div>
          </div>
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
        
        {/* Statistiques en temps réel avec indicateur de dernière mise à jour */}
        <div className="text-center text-sm text-gray-500">
          {readingItems.length > 0 && (
            <div className="space-y-1">
              <span>
                {readingItems.filter(i => i.completed).length} / {readingItems.length} passages complétés
              </span>
              {lastUpdateTime && (
                <div className="text-xs text-green-600">
                  Dernière mise à jour : {lastUpdateTime.toLocaleTimeString()}
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
});

OptimizedReadingPlan.displayName = 'OptimizedReadingPlan';

export default OptimizedReadingPlan;
