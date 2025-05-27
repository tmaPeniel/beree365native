
/**
 * Version optimisée du composant ReadingPlan
 */

import React, { useCallback, useMemo, useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Check, Loader2 } from 'lucide-react';
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';
import { getReadingPlanForDay } from '@/services/readingPlan';
import { getCachedUserProgressForDay, optimizedToggleChapterStatus } from '@/services/readingPlan/optimizedProgressService';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface ReadingItem {
  id: string;
  reference: string;
  completed: boolean;
}

interface OptimizedReadingPlanProps {
  dayNumber: number;
}

/**
 * Composant ReadingPlan optimisé avec React Query et mémorisation
 */
const OptimizedReadingPlan = React.memo<OptimizedReadingPlanProps>(({ dayNumber }) => {
  const { user, triggerProgressUpdate } = useOptimizedAuth();
  const [processingIds, setProcessingIds] = useState<string[]>([]);
  const queryClient = useQueryClient();

  // Requête optimisée pour les chapitres du jour
  const { data: chaptersData = [] } = useQuery({
    queryKey: ['reading-plan-chapters', dayNumber],
    queryFn: () => getReadingPlanForDay(dayNumber),
    staleTime: 10 * 60 * 1000, // 10 minutes
    enabled: !!dayNumber
  });

  // Requête optimisée pour la progression utilisateur
  const { data: progressData = [], isLoading } = useQuery({
    queryKey: ['user-progress', user?.id, dayNumber],
    queryFn: () => user ? getCachedUserProgressForDay(user.id, dayNumber) : [],
    staleTime: 2 * 60 * 1000, // 2 minutes
    enabled: !!user && !!dayNumber
  });

  // Mémoriser les éléments de lecture pour éviter les recalculs
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

  // Handler optimisé avec useCallback
  const handleToggleRead = useCallback(async (event: React.MouseEvent, id: string) => {
    // Empêcher la propagation et le comportement par défaut
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
        // Mise à jour optimiste du cache au lieu d'invalidation agressive
        queryClient.setQueryData(['user-progress', user.id, dayNumber], (oldData: any[]) => {
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
            // Ajouter une nouvelle entrée
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
        
        triggerProgressUpdate();
      }
    } catch (error) {
      console.error(`Error toggling read status for chapter ${id}:`, error);
      toast.error("Une erreur est survenue lors de la mise à jour");
      
      // En cas d'erreur, invalider pour récupérer l'état correct
      queryClient.invalidateQueries({ 
        queryKey: ['user-progress', user.id, dayNumber] 
      });
    } finally {
      setProcessingIds(prev => prev.filter(itemId => itemId !== id));
    }
  }, [user, readingItems, dayNumber, queryClient, triggerProgressUpdate, chaptersData]);

  // Composant de ligne mémorisé pour éviter les re-rendus
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
        className={`flex items-center w-full text-left ${
          item.completed ? 'text-gray-400' : 'text-gray-800'
        } ${isProcessing ? 'opacity-70' : ''}`}
      >
        <div className={`h-5 w-5 rounded mr-3 flex items-center justify-center transition-colors ${
          item.completed ? 'bg-green-500' : 'border-2 border-green-300'
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

  if (isLoading) {
    return (
      <Card className="bg-white border-none shadow-sm">
        <CardContent className="p-6">
          <div className="flex justify-center items-center h-48">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-green-500"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white border-none shadow-sm">
      <CardContent className="p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Aujourd'hui</h2>
          <span className="text-sm bg-green-100 text-green-700 py-1 px-3 rounded-full">
            Jour {dayNumber}/365
          </span>
        </div>
        
        <div className="mb-6">
          <h3 className="font-medium text-gray-700 mb-3">Passages du jour</h3>
          {readingItems.length > 0 ? (
            <ul className="space-y-3">
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

OptimizedReadingPlan.displayName = 'OptimizedReadingPlan';

export default OptimizedReadingPlan;
