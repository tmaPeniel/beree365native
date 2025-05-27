
import React, { useMemo, useCallback, useState } from 'react';
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';
import { optimizedToggleChapterStatus } from '@/services/readingPlan/optimizedProgressService';
import { useQueryClient } from '@tanstack/react-query';
import { Check, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface Chapter {
  id: string;
  reference: string;
  completed: boolean;
  progressId?: string | null;
}

interface ExpandedDayCardProps {
  day: number;
  date: string;
  isToday?: boolean;
  chapters: Chapter[];
  progressPercentage: number;
}

const ExpandedDayCard = React.memo<ExpandedDayCardProps>(({ 
  day, 
  date, 
  isToday = false,
  chapters,
  progressPercentage
}) => {
  const { user } = useOptimizedAuth();
  const [processingIds, setProcessingIds] = useState<string[]>([]);
  const queryClient = useQueryClient();
  
  // Mémoriser la date formatée
  const formattedDate = useMemo(() => 
    new Date(date).toLocaleDateString('fr-FR', { 
      day: 'numeric', 
      month: 'short' 
    }), [date]
  );

  // Handler optimisé pour toggle le statut d'un passage
  const handleToggleRead = useCallback(async (event: React.MouseEvent, chapterId: string) => {
    event.preventDefault();
    event.stopPropagation();
    
    if (!user) {
      toast.error("Vous devez être connecté pour modifier le statut de lecture");
      return;
    }
    
    const chapter = chapters.find(ch => ch.id === chapterId);
    if (!chapter) return;
    
    try {
      setProcessingIds(prev => [...prev, chapterId]);
      
      const result = await optimizedToggleChapterStatus(
        user.id, 
        chapterId, 
        chapter.completed ? 'completed' : 'pending',
        day
      );
      
      if (result.success) {
        // Mise à jour optimiste du cache global
        queryClient.setQueryData(['reading-plan-full-data', user.id], (oldData: any) => {
          if (!oldData) return oldData;
          
          return oldData.map((dayData: any) => {
            if (dayData.day !== day) return dayData;
            
            const updatedChapters = dayData.chapters.map((ch: Chapter) => {
              if (ch.id === chapterId) {
                return {
                  ...ch,
                  completed: !ch.completed
                };
              }
              return ch;
            });
            
            // Recalculer la progression pour ce jour
            const completedCount = updatedChapters.filter((ch: Chapter) => ch.completed).length;
            const newProgressPercentage = updatedChapters.length > 0 
              ? Math.round((completedCount / updatedChapters.length) * 100) 
              : 0;
            
            return {
              ...dayData,
              chapters: updatedChapters,
              progressPercentage: newProgressPercentage,
              completed: newProgressPercentage === 100
            };
          });
        });
      }
    } catch (error) {
      console.error(`Error toggling read status for chapter ${chapterId}:`, error);
      toast.error("Une erreur est survenue lors de la mise à jour");
      
      // En cas d'erreur, invalider le cache global
      queryClient.invalidateQueries({ 
        queryKey: ['reading-plan-full-data', user.id] 
      });
    } finally {
      setProcessingIds(prev => prev.filter(itemId => itemId !== chapterId));
    }
  }, [user, chapters, day, queryClient]);

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
        {chapters.length > 0 ? (
          chapters.map((chapter) => (
            <div key={chapter.id} className="flex items-center space-x-2">
              <button
                type="button"
                onClick={(event) => handleToggleRead(event, chapter.id)}
                disabled={processingIds.includes(chapter.id)}
                className={`flex-shrink-0 h-4 w-4 rounded border-2 flex items-center justify-center transition-colors ${
                  chapter.completed 
                    ? 'bg-green-500 border-green-500' 
                    : 'border-green-300 hover:border-green-400'
                } ${processingIds.includes(chapter.id) ? 'opacity-70' : ''}`}
              >
                {processingIds.includes(chapter.id) ? (
                  <Loader2 className="h-2.5 w-2.5 text-white animate-spin" />
                ) : (
                  chapter.completed && <Check className="h-2.5 w-2.5 text-white" />
                )}
              </button>
              
              <span className={`text-sm ${
                chapter.completed ? 'line-through text-gray-400' : 'text-gray-700'
              }`}>
                {chapter.reference}
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
