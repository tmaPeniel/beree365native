import React, { useMemo, useCallback, useState } from 'react';
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';
import { markAllChaptersAsRead } from '@/services/readingPlan/optimizedCacheService';
import { optimizedToggleChapterStatus } from '@/services/readingPlan/optimizedProgressService';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { getCachedUserProgressForDay } from '@/services/readingPlan/optimizedProgressService';
import { Check, Loader2, CheckCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useBadgeNotification } from '@/contexts/BadgeNotificationContext';

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
  const [isMarkingAll, setIsMarkingAll] = useState(false);
  const queryClient = useQueryClient();
  const { showBadgeUnlocked } = useBadgeNotification();
  
  // Ajouter le rafraîchissement automatique pour synchroniser les cartes
  const { data: progressData } = useQuery({
    queryKey: ['user-progress-refresh', user?.id, day],
    queryFn: () => user ? getCachedUserProgressForDay(user.id, day) : null,
    enabled: !!user,
    refetchInterval: 500, // Rafraîchir toutes les 2 secondes
    staleTime: 1000, // Considérer les données comme périmées après 1 seconde
  });
  
  // Invalider le cache global quand les données de progression changent
  React.useEffect(() => {
    if (progressData && user) {
      queryClient.invalidateQueries({ 
        queryKey: ['optimized-reading-plan-data', user.id] 
      });
    }
  }, [progressData, user, queryClient]);
  
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
        // Afficher les nouveaux badges débloqués
        if (result.newBadges && result.newBadges.length > 0) {
          for (const badge of result.newBadges) {
            showBadgeUnlocked(badge);
          }
        }
        
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

  // Handler pour marquer tous les passages comme lus
  const handleMarkAllRead = useCallback(async () => {
    if (!user || isMarkingAll) return;
    
    const uncompletedChapters = chapters.filter(ch => !ch.completed);
    
    if (uncompletedChapters.length === 0) {
      toast.info("Tous les passages sont déjà cochés !");
      return;
    }
    
    setIsMarkingAll(true);
    
    try {
      // Utiliser la fonction optimisée pour marquer tous les chapitres d'un coup
      const result = await markAllChaptersAsRead(
        user.id, 
        uncompletedChapters.map(ch => ch.id), 
        day
      );
      
      if (result.success) {
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
        // Notification unique globale
        toast.success(`${uncompletedChapters.length} passage${uncompletedChapters.length > 1 ? 's' : ''} marqué${uncompletedChapters.length > 1 ? 's' : ''} comme lu${uncompletedChapters.length > 1 ? 's' : ''} !`);
      } else {
        throw new Error(result.error || 'Erreur inconnue');
      }
      
    } catch (error) {
      console.error('Error marking all chapters as read:', error);
      toast.error("Une erreur est survenue lors du marquage");
      queryClient.invalidateQueries({ 
        queryKey: ['optimized-reading-plan-data', user.id] 
      });
    } finally {
      setIsMarkingAll(false);
    }
  }, [user, chapters, day, queryClient, triggerProgressUpdate, isMarkingAll]);

  // Classes CSS mémorisées avec optimisation mobile
  const cardClasses = useMemo(() => 
    `relative w-full rounded-xl border transition-all ${
      isMobile ? 'p-3' : 'p-4'
    } ${
      isToday 
        ? 'bg-primary/10 border-primary/30 shadow-md' 
        : 'bg-card border-border hover:shadow-sm'
    }`, [isToday, isMobile]
  );
  
  return (
    <div className={cardClasses}>
      {/* En-tête de la carte */}
      <div className={`flex items-center justify-between ${isMobile ? 'mb-2' : 'mb-3'}`}>
        <div className="flex flex-col">
          <span className={`${isMobile ? 'text-xs' : 'text-sm'} font-semibold ${
            isToday ? 'text-primary' : 'text-foreground'
          }`}>
            Jour {day}
          </span>
          <span className={`${isMobile ? 'text-xs' : 'text-xs'} text-muted-foreground`}>
            {formattedDate}
          </span>
        </div>
      </div>
      
      
      {/* En-tête des passages */}
      {chapters && chapters.length > 0 && (
        <div className={`flex items-center justify-between ${isMobile ? 'mb-2' : 'mb-3'}`}>
          <span className={`${isMobile ? 'text-xs' : 'text-sm'} font-medium text-foreground`}>
            Passages du jour
          </span>
        </div>
      )}
      
      {/* Liste des passages */}
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
                    ? 'bg-primary border-primary' 
                    : 'border-primary/30 hover:border-primary'
                } ${processingIds.includes(chapter.id) ? 'opacity-70' : ''}`}
              >
                {processingIds.includes(chapter.id) ? (
                  <Loader2 className={`${isMobile ? 'h-2 w-2' : 'h-2.5 w-2.5'} text-primary-foreground animate-gentle-spin`} />
                ) : (
                  chapter.completed && <Check className={`${isMobile ? 'h-2 w-2' : 'h-2.5 w-2.5'} text-primary-foreground`} />
                )}
              </button>
              
              <span className={`${isMobile ? 'text-xs' : 'text-sm'} ${
                chapter.completed ? 'line-through text-muted-foreground' : 'text-foreground'
              } leading-tight`}>
                {chapter.reference}
              </span>
            </div>
          ))
        ) : (
          <p className={`${isMobile ? 'text-xs' : 'text-xs'} text-muted-foreground italic`}>
            Aucun passage trouvé
          </p>
        )}
      </div>
      
      {/* Bouton "Tout cocher" en bas */}
      {chapters && chapters.length > 0 && chapters.some(ch => !ch.completed) && (
        <div className={`flex justify-center ${isMobile ? 'mb-2' : 'mb-3'}`}>
          <Button
            variant="outline"
            size="sm"
            onClick={handleMarkAllRead}
            disabled={isMarkingAll}
            className={`${isMobile ? 'h-6 px-2 text-xs' : 'h-7 px-3 text-xs'} border-primary/20 hover:border-primary/30 hover:bg-primary/10`}
          >
            {isMarkingAll ? (
              <Loader2 className={`${isMobile ? 'h-2.5 w-2.5' : 'h-3 w-3'} animate-spin mr-1`} />
            ) : (
              <CheckCheck className={`${isMobile ? 'h-2.5 w-2.5' : 'h-3 w-3'} mr-1`} />
            )}
            Tout cocher
          </Button>
        </div>
      )}
      
      {/* Pourcentage positionné en bas de la carte */}
      <div className="absolute bottom-2 right-2">
        <span className={`${
          isMobile ? 'text-xs px-1.5 py-0.5' : 'text-xs px-2 py-1'
        } font-medium rounded-full ${
          progressPercentage === 0
            ? 'bg-muted text-muted-foreground' // Style discret pour 0%
            : progressPercentage >= 100
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-foreground'
        }`}>
          {progressPercentage}%
        </span>
      </div>
    </div>
  );
});

ExpandedDayCard.displayName = 'ExpandedDayCard';

export default ExpandedDayCard;