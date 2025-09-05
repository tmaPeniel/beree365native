
import React, { useCallback, useMemo, useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';
import { getReadingPlanForDay } from '@/services/readingPlan';
import { getCachedUserProgressForDay, optimizedToggleChapterStatus } from '@/services/readingPlan/optimizedProgressService';
import { Check, Loader2 } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import CelebrationEffects from '@/components/animations/CelebrationEffects';

interface ReadingItem {
  id: string;
  reference: string;
  completed: boolean;
}

interface OptimizedDayReadingDialogProps {
  day: number;
  date: string;
  isOpen: boolean;
  onClose: () => void;
}

const OptimizedDayReadingDialog = React.memo<OptimizedDayReadingDialogProps>(({ 
  day, 
  date, 
  isOpen, 
  onClose 
}) => {
  const { user, triggerProgressUpdate } = useOptimizedAuth();
  const [processingIds, setProcessingIds] = useState<string[]>([]);
  const [showCelebration, setShowCelebration] = useState(false);
  const queryClient = useQueryClient();
  
  const formattedDate = useMemo(() => 
    new Date(date).toLocaleDateString('fr-FR', { 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric' 
    }), [date]
  );
  
  // Requêtes optimisées avec React Query
  const { data: chaptersData = [] } = useQuery({
    queryKey: ['reading-plan-chapters', day],
    queryFn: () => user ? getReadingPlanForDay(day, user.id) : [],
    enabled: isOpen && !!day && !!user,
    staleTime: 10 * 60 * 1000
  });

  const { data: progressData = [], isLoading } = useQuery({
    queryKey: ['user-progress', user?.id, day],
    queryFn: () => user ? getCachedUserProgressForDay(user.id, day) : [],
    enabled: isOpen && !!user && !!day,
    staleTime: 2 * 60 * 1000
  });

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

  // Vérifier si le jour est complètement terminé
  const isDayComplete = useMemo(() => {
    return readingItems.length > 0 && readingItems.every(item => item.completed);
  }, [readingItems]);

  // Déclencher l'animation de célébration quand le jour est complété
  useEffect(() => {
    if (isDayComplete && readingItems.length > 0 && !showCelebration) {
      setShowCelebration(true);
      toast.success(`🎉 Félicitations ! Jour ${day} terminé !`, {
        duration: 3000,
      });
      
      // Réinitialiser l'animation après 3 secondes
      setTimeout(() => {
        setShowCelebration(false);
      }, 3000);
    }
  }, [isDayComplete, readingItems.length, day, showCelebration]);
  
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
        day
      );
      
      if (result.success) {
        // Mise à jour optimiste du cache au lieu d'invalidation agressive
        queryClient.setQueryData(['user-progress', user.id, day], (oldData: any[]) => {
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
        
        // Mise à jour optimiste des données du plan de lecture global
        queryClient.setQueryData(['reading-plan-days', user.id], (oldDays: any[]) => {
          if (!oldDays) return oldDays;
          return oldDays.map(dayData => {
            if (dayData.day === day) {
              // Recalculer le statut de completion pour ce jour
              const dayChapters = chaptersData.length;
              const currentProgress = queryClient.getQueryData(['user-progress', user.id, day]) as any[];
              const completedCount = currentProgress?.filter(p => p.status === 'completed').length || 0;
              
              return {
                ...dayData,
                completed: completedCount === dayChapters && dayChapters > 0
              };
            }
            return dayData;
          });
        });
        
        triggerProgressUpdate();
      }
    } catch (error) {
      console.error(`Error toggling read status for chapter ${id}:`, error);
      toast.error("Une erreur est survenue lors de la mise à jour");
      
      // En cas d'erreur, invalider pour récupérer l'état correct
      queryClient.invalidateQueries({ 
        queryKey: ['user-progress', user.id, day] 
      });
    } finally {
      setProcessingIds(prev => prev.filter(itemId => itemId !== id));
    }
  }, [user, readingItems, day, queryClient, triggerProgressUpdate, chaptersData]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center">
            <div className="mb-1 text-lg font-bold">Jour {day}</div>
            <div className="text-sm text-gray-500">{formattedDate}</div>
          </DialogTitle>
        </DialogHeader>
        
        <div className="mt-4">
          <h3 className="text-md font-medium text-center mb-4">Passages à lire</h3>
          
          {isLoading ? (
            <div className="flex justify-center items-center h-24">
              <div className="animate-gentle-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
            </div>
          ) : (
            <div className="space-y-3 max-h-[60vh] overflow-y-auto px-1">
              {readingItems.length > 0 ? (
                readingItems.map((item, index) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      if (!processingIds.includes(item.id)) {
                        handleToggleRead(event, item.id);
                      }
                    }}
                    disabled={processingIds.includes(item.id)}
                    className={`flex items-center w-full p-3 text-left rounded-md transition-all duration-300 ${
                      item.completed ? 'text-muted-foreground bg-muted animate-success-bounce' : 'text-foreground hover:bg-muted/50 hover:animate-lift'
                    } ${processingIds.includes(item.id) ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer'}`}
                    style={{ animationDelay: `${index * 0.1}s` }}
                  >
                    <div className={`h-6 w-6 rounded mr-3 flex items-center justify-center transition-all duration-300 ${
                      item.completed ? 'bg-primary animate-scale-fade-in' : 'border-2 border-primary/30 hover:border-primary'
                    }`}>
                      {processingIds.includes(item.id) ? (
                        <Loader2 className="h-4 w-4 text-white animate-gentle-spin" />
                      ) : (
                        item.completed && <Check className="h-4 w-4 text-white animate-success-bounce" />
                      )}
                    </div>
                    <span className={`transition-all duration-300 ${item.completed ? 'line-through' : ''}`}>
                      {item.reference}
                    </span>
                  </button>
                ))
              ) : (
                <p className="text-center text-gray-500 my-4">
                  Aucun passage trouvé pour ce jour
                </p>
              )}
            </div>
          )}
        </div>
        
        {/* Animation de célébration pour jour complété */}
        <CelebrationEffects 
          trigger={showCelebration}
          type="day-complete"
          onComplete={() => setShowCelebration(false)}
        />
      </DialogContent>
    </Dialog>
  );
});

OptimizedDayReadingDialog.displayName = 'OptimizedDayReadingDialog';

export default OptimizedDayReadingDialog;
