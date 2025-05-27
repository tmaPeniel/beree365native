
import React, { useMemo, useCallback, useState } from 'react';
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';
import { getReadingPlanForDay, getDayProgress } from '@/services/readingPlan';
import { getCachedUserProgressForDay, optimizedToggleChapterStatus } from '@/services/readingPlan/optimizedProgressService';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface ExpandedDayCardProps {
  day: number;
  date: string;
  isToday?: boolean;
}

const ExpandedDayCard = React.memo<ExpandedDayCardProps>(({ 
  day, 
  date, 
  isToday = false
}) => {
  const { user, progressUpdateCounter } = useOptimizedAuth();
  const [processingIds, setProcessingIds] = useState<string[]>([]);
  const queryClient = useQueryClient();
  
  // Mémoriser la date formatée
  const formattedDate = useMemo(() => 
    new Date(date).toLocaleDateString('fr-FR', { 
      day: 'numeric', 
      month: 'short' 
    }), [date]
  );
  
  // Requête pour les chapitres du jour
  const { data: chaptersData = [] } = useQuery({
    queryKey: ['reading-plan-chapters', day],
    queryFn: () => getReadingPlanForDay(day),
    staleTime: 10 * 60 * 1000,
    enabled: !!day
  });

  // Requête pour la progression utilisateur
  const { data: progressData = [] } = useQuery({
    queryKey: ['user-progress', user?.id, day],
    queryFn: () => user ? getCachedUserProgressForDay(user.id, day) : [],
    staleTime: 2 * 60 * 1000,
    enabled: !!user && !!day
  });

  // Requête pour le pourcentage de progression
  const { data: progressPercentage = 0 } = useQuery({
    queryKey: ['day-progress', user?.id, day, progressUpdateCounter],
    queryFn: () => user ? getDayProgress(user.id, day) : 0,
    enabled: !!user,
    staleTime: 60 * 1000
  });

  // Mémoriser les éléments de lecture
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

  // Handler pour toggle le statut d'un passage
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
        day
      );
      
      if (result.success) {
        // Mise à jour optimiste du cache
        queryClient.setQueryData(['user-progress', user.id, day], (oldData: any[]) => {
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
      }
    } catch (error) {
      console.error(`Error toggling read status for chapter ${id}:`, error);
      toast.error("Une erreur est survenue lors de la mise à jour");
      
      queryClient.invalidateQueries({ 
        queryKey: ['user-progress', user.id, day] 
      });
    } finally {
      setProcessingIds(prev => prev.filter(itemId => itemId !== id));
    }
  }, [user, readingItems, day, queryClient, chaptersData]);

  // Classes CSS mémorisées
  const cardClasses = useMemo(() => 
    `w-full rounded-xl border transition-all p-4 ${
      isToday 
        ? 'bg-green-50 border-green-200 shadow-md' 
        : 'bg-white border-gray-200 hover:shadow-sm'
    }`, [isToday]
  );
  
  return (
    <div className={cardClasses}>
      {/* En-tête de la carte */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex flex-col">
          <span className={`text-sm font-semibold ${isToday ? 'text-green-700' : 'text-gray-900'}`}>
            Jour {day}
          </span>
          <span className="text-xs text-gray-500">{formattedDate}</span>
        </div>
        
        {progressPercentage > 0 && (
          <div className="flex items-center">
            <span className={`text-xs font-medium px-2 py-1 rounded-full ${
              isToday ? 'bg-green-200 text-green-800' : 'bg-gray-100 text-gray-600'
            }`}>
              {progressPercentage}%
            </span>
          </div>
        )}
      </div>
      
      {/* Liste des passages */}
      <div className="space-y-2">
        {readingItems.length > 0 ? (
          readingItems.map((item) => (
            <div key={item.id} className="flex items-center space-x-2">
              <button
                type="button"
                onClick={(event) => handleToggleRead(event, item.id)}
                disabled={processingIds.includes(item.id)}
                className={`flex-shrink-0 h-4 w-4 rounded border-2 flex items-center justify-center transition-colors ${
                  item.completed 
                    ? 'bg-green-500 border-green-500' 
                    : 'border-green-300 hover:border-green-400'
                } ${processingIds.includes(item.id) ? 'opacity-70' : ''}`}
              >
                {processingIds.includes(item.id) ? (
                  <Loader2 className="h-2.5 w-2.5 text-white animate-spin" />
                ) : (
                  item.completed && <Check className="h-2.5 w-2.5 text-white" />
                )}
              </button>
              
              <span className={`text-sm ${
                item.completed ? 'line-through text-gray-400' : 'text-gray-700'
              }`}>
                {item.reference}
              </span>
            </div>
          ))
        ) : (
          <p className="text-xs text-gray-400 italic">
            Aucun passage trouvé
          </p>
        )}
      </div>
    </div>
  );
});

ExpandedDayCard.displayName = 'ExpandedDayCard';

export default ExpandedDayCard;
