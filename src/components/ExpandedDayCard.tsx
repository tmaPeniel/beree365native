
import React, { useMemo, useCallback, useState } from 'react';
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';
import { optimizedToggleChapterStatus } from '@/services/readingPlan/optimizedCacheService';
import { useQueryClient } from '@tanstack/react-query';
import { Check, Loader2, CheckSquare, Square, RotateCcw } from 'lucide-react';
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
  isMobile?: boolean;
}

const ExpandedDayCard = React.memo<ExpandedDayCardProps>(({ 
  day, 
  date, 
  isToday = false,
  chapters,
  progressPercentage,
  isMobile = false
}) => {
  const { user, triggerProgressUpdate } = useOptimizedAuth();
  const [processingIds, setProcessingIds] = useState<string[]>([]);
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);
  const queryClient = useQueryClient();
  
  // Mémoriser la date formatée
  const formattedDate = useMemo(() => 
    new Date(date).toLocaleDateString('fr-FR', { 
      day: 'numeric', 
      month: 'short' 
    }), [date]
  );

  // Handler ultra-optimisé pour toggle le statut d'un passage
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
        // Mise à jour optimiste ultra-ciblée du cache global
        queryClient.setQueryData(['optimized-reading-plan-data', user.id], (oldData: any[]) => {
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
        
        // Déclencher la mise à jour des statistiques
        triggerProgressUpdate();
      }
    } catch (error) {
      console.error(`Error toggling read status for chapter ${chapterId}:`, error);
      toast.error("Une erreur est survenue lors de la mise à jour");
      
      // En cas d'erreur, invalider seulement le cache global
      queryClient.invalidateQueries({ 
        queryKey: ['optimized-reading-plan-data', user.id] 
      });
    } finally {
      setProcessingIds(prev => prev.filter(itemId => itemId !== chapterId));
    }
  }, [user, chapters, day, queryClient, triggerProgressUpdate]);

  // Handler pour tout cocher
  const handleCheckAll = useCallback(async () => {
    if (!user || isBulkProcessing) return;
    
    const uncompletedChapters = chapters.filter(ch => !ch.completed);
    if (uncompletedChapters.length === 0) return;
    
    setIsBulkProcessing(true);
    try {
      // Traiter tous les chapitres non complétés
      const promises = uncompletedChapters.map(chapter => 
        optimizedToggleChapterStatus(user.id, chapter.id, 'completed', day)
      );
      
      await Promise.all(promises);
      
      // Mise à jour optimiste du cache
      queryClient.setQueryData(['optimized-reading-plan-data', user.id], (oldData: any[]) => {
        if (!oldData) return oldData;
        
        return oldData.map((dayData: any) => {
          if (dayData.day !== day) return dayData;
          
          const updatedChapters = dayData.chapters.map((ch: Chapter) => ({
            ...ch,
            completed: true
          }));
          
          return {
            ...dayData,
            chapters: updatedChapters,
            progressPercentage: 100,
            completed: true
          };
        });
      });
      
      triggerProgressUpdate();
      toast.success(`Tous les passages du jour ${day} ont été cochés`);
    } catch (error) {
      console.error('Error checking all chapters:', error);
      toast.error("Une erreur est survenue lors de la mise à jour");
      queryClient.invalidateQueries({ 
        queryKey: ['optimized-reading-plan-data', user.id] 
      });
    } finally {
      setIsBulkProcessing(false);
    }
  }, [user, chapters, day, queryClient, triggerProgressUpdate, isBulkProcessing]);

  // Handler pour tout décocher
  const handleUncheckAll = useCallback(async () => {
    if (!user || isBulkProcessing) return;
    
    const completedChapters = chapters.filter(ch => ch.completed);
    if (completedChapters.length === 0) return;
    
    setIsBulkProcessing(true);
    try {
      // Traiter tous les chapitres complétés
      const promises = completedChapters.map(chapter => 
        optimizedToggleChapterStatus(user.id, chapter.id, 'pending', day)
      );
      
      await Promise.all(promises);
      
      // Mise à jour optimiste du cache
      queryClient.setQueryData(['optimized-reading-plan-data', user.id], (oldData: any[]) => {
        if (!oldData) return oldData;
        
        return oldData.map((dayData: any) => {
          if (dayData.day !== day) return dayData;
          
          const updatedChapters = dayData.chapters.map((ch: Chapter) => ({
            ...ch,
            completed: false
          }));
          
          return {
            ...dayData,
            chapters: updatedChapters,
            progressPercentage: 0,
            completed: false
          };
        });
      });
      
      triggerProgressUpdate();
      toast.success(`Tous les passages du jour ${day} ont été décochés`);
    } catch (error) {
      console.error('Error unchecking all chapters:', error);
      toast.error("Une erreur est survenue lors de la mise à jour");
      queryClient.invalidateQueries({ 
        queryKey: ['optimized-reading-plan-data', user.id] 
      });
    } finally {
      setIsBulkProcessing(false);
    }
  }, [user, chapters, day, queryClient, triggerProgressUpdate, isBulkProcessing]);

  // Bouton intelligent unique pour cocher/décocher tout
  const handleToggleAll = useCallback(async () => {
    if (!user || isBulkProcessing) return;
    
    const allCompleted = chapters.every(ch => ch.completed);
    
    if (allCompleted) {
      // Si tout est coché, on décoche tout
      await handleUncheckAll();
    } else {
      // Sinon, on coche tout
      await handleCheckAll();
    }
  }, [user, chapters, handleCheckAll, handleUncheckAll, isBulkProcessing]);

  // Mémoriser l'état et l'icône du bouton
  const buttonState = useMemo(() => {
    const allCompleted = chapters.every(ch => ch.completed);
    const noneCompleted = chapters.every(ch => !ch.completed);
    
    if (allCompleted) {
      return {
        icon: RotateCcw,
        title: 'Tout décocher',
        color: 'text-gray-600 hover:bg-gray-50'
      };
    } else {
      return {
        icon: CheckSquare,
        title: 'Tout cocher',
        color: 'text-green-600 hover:bg-green-50'
      };
    }
  }, [chapters]);

  // Classes CSS mémorisées avec optimisation mobile
  const cardClasses = useMemo(() => 
    `relative w-full rounded-xl border transition-all ${
      isMobile ? 'p-3' : 'p-4'
    } ${
      isToday 
        ? 'bg-green-50 border-green-200 shadow-md' 
        : 'bg-white border-gray-200 hover:shadow-sm'
    }`, [isToday, isMobile]
  );
  
  return (
    <div className={cardClasses}>
      {/* En-tête de la carte */}
      <div className={`flex items-center justify-between ${isMobile ? 'mb-2' : 'mb-3'}`}>
        <div className="flex flex-col">
          <span className={`${isMobile ? 'text-xs' : 'text-sm'} font-semibold ${
            isToday ? 'text-green-700' : 'text-gray-900'
          }`}>
            Jour {day}
          </span>
          <span className={`${isMobile ? 'text-xs' : 'text-xs'} text-gray-500`}>
            {formattedDate}
          </span>
        </div>
        
        {/* Bouton d'action unique intelligent */}
        {chapters && chapters.length > 0 && (
          <button
            onClick={handleToggleAll}
            disabled={isBulkProcessing}
            className={`${isMobile ? 'p-1' : 'p-1.5'} rounded transition-colors ${buttonState.color} active:animate-press`}
            title={buttonState.title}
          >
            {isBulkProcessing ? (
              <Loader2 className={`${isMobile ? 'h-3 w-3' : 'h-4 w-4'} animate-gentle-spin`} />
            ) : (
              <buttonState.icon className={`${isMobile ? 'h-3 w-3' : 'h-4 w-4'}`} />
            )}
          </button>
        )}
      </div>
      
      {/* Liste des passages optimisée pour mobile */}
      <div className={`space-y-${isMobile ? '1.5' : '2'} mb-3`}>
        {chapters && chapters.length > 0 ? (
          chapters.map((chapter) => (
            <div key={chapter.id} className={`flex items-center ${isMobile ? 'space-x-1.5' : 'space-x-2'}`}>
              <button
                type="button"
                onClick={(event) => handleToggleRead(event, chapter.id)}
                disabled={processingIds.includes(chapter.id)}
                className={`flex-shrink-0 ${
                  isMobile ? 'h-3.5 w-3.5' : 'h-4 w-4'
                } rounded border-2 flex items-center justify-center transition-colors ${
                  chapter.completed 
                    ? 'bg-green-500 border-green-500' 
                    : 'border-green-300 hover:border-green-400'
                } ${processingIds.includes(chapter.id) ? 'opacity-70' : ''}`}
              >
                {processingIds.includes(chapter.id) ? (
                  <Loader2 className={`${isMobile ? 'h-2 w-2' : 'h-2.5 w-2.5'} text-white animate-gentle-spin`} />
                ) : (
                  chapter.completed && <Check className={`${isMobile ? 'h-2 w-2' : 'h-2.5 w-2.5'} text-white`} />
                )}
              </button>
              
              <span className={`${isMobile ? 'text-xs' : 'text-sm'} ${
                chapter.completed ? 'line-through text-gray-400' : 'text-gray-700'
              } leading-tight`}>
                {chapter.reference}
              </span>
            </div>
          ))
        ) : (
          <p className={`${isMobile ? 'text-xs' : 'text-xs'} text-gray-400 italic`}>
            Aucun passage trouvé
          </p>
        )}
      </div>
      
      {/* Pourcentage positionné en bas de la carte */}
      <div className="absolute bottom-2 right-2">
        <span className={`${
          isMobile ? 'text-xs px-1.5 py-0.5' : 'text-xs px-2 py-1'
        } font-medium rounded-full ${
          progressPercentage === 0
            ? 'bg-gray-100 text-gray-500' // Style discret pour 0%
            : isToday 
              ? 'bg-green-200 text-green-800' 
              : 'bg-gray-100 text-gray-600'
        }`}>
          {progressPercentage}%
        </span>
      </div>
    </div>
  );
});

ExpandedDayCard.displayName = 'ExpandedDayCard';

export default ExpandedDayCard;
