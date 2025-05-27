
import React, { useCallback, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';
import { getReadingPlanForDay } from '@/services/readingPlan';
import { getCachedUserProgressForDay, optimizedToggleChapterStatus } from '@/services/readingPlan/optimizedProgressService';
import { Check, Loader2 } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

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
    queryFn: () => getReadingPlanForDay(day),
    enabled: isOpen && !!day,
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
  
  const handleToggleRead = useCallback(async (id: string) => {
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
        queryClient.invalidateQueries({ 
          queryKey: ['user-progress', user.id, day] 
        });
        triggerProgressUpdate();
      }
    } catch (error) {
      console.error(`Error toggling read status for chapter ${id}:`, error);
      toast.error("Une erreur est survenue lors de la mise à jour");
    } finally {
      setProcessingIds(prev => prev.filter(itemId => itemId !== id));
    }
  }, [user, readingItems, day, queryClient, triggerProgressUpdate]);

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
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-green-500"></div>
            </div>
          ) : (
            <div className="space-y-3 max-h-[60vh] overflow-y-auto px-1">
              {readingItems.length > 0 ? (
                readingItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => !processingIds.includes(item.id) && handleToggleRead(item.id)}
                    disabled={processingIds.includes(item.id)}
                    className={`flex items-center w-full p-3 text-left rounded-md hover:bg-gray-100 transition-colors ${
                      item.completed ? 'text-gray-400 bg-gray-50' : 'text-gray-800'
                    } ${processingIds.includes(item.id) ? 'opacity-70' : ''}`}
                  >
                    <div className={`h-6 w-6 rounded mr-3 flex items-center justify-center transition-colors ${
                      item.completed ? 'bg-green-500' : 'border-2 border-green-300'
                    }`}>
                      {processingIds.includes(item.id) ? (
                        <Loader2 className="h-4 w-4 text-white animate-spin" />
                      ) : (
                        item.completed && <Check className="h-4 w-4 text-white" />
                      )}
                    </div>
                    <span className={item.completed ? 'line-through' : ''}>
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
      </DialogContent>
    </Dialog>
  );
});

OptimizedDayReadingDialog.displayName = 'OptimizedDayReadingDialog';

export default OptimizedDayReadingDialog;
