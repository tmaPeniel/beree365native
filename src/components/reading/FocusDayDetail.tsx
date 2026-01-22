import React, { useCallback, useState, useMemo } from "react";
import { Check, Loader2, ChevronRight, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useOptimizedAuth } from "@/hooks/useOptimizedAuth";
import { useQueryClient } from "@tanstack/react-query";
import { optimizedToggleChapterStatus } from "@/services/readingPlan/optimizedProgressService";
import { markAllChaptersAsRead } from "@/services/readingPlan/optimizedCacheService";
import { toast } from "sonner";
import { useBadgeNotification } from "@/contexts/BadgeNotificationContext";

interface Chapter {
  id: string;
  reference: string;
  completed: boolean;
  progressId?: string | null;
}

interface FocusDayDetailProps {
  day: number;
  totalDays: number;
  date: string;
  chapters: Chapter[];
  progressPercentage: number;
  onNavigateDay: (direction: "prev" | "next") => void;
  canNavigatePrev: boolean;
  canNavigateNext: boolean;
}

/**
 * Composant d'affichage détaillé d'un jour en vue focus
 * Affiche les chapitres avec possibilité de les cocher
 */
const FocusDayDetail = React.memo<FocusDayDetailProps>(
  ({ day, totalDays, date, chapters, progressPercentage, onNavigateDay, canNavigatePrev, canNavigateNext }) => {
    const { user, triggerProgressUpdate } = useOptimizedAuth();
    const queryClient = useQueryClient();
    const { showBadgeUnlocked } = useBadgeNotification();
    const [processingIds, setProcessingIds] = useState<string[]>([]);
    const [isMarkingAll, setIsMarkingAll] = useState(false);

    // État local pour mise à jour optimiste immédiate
    const [localChapters, setLocalChapters] = useState<Chapter[]>(chapters);

    // Synchroniser avec les props quand elles changent (changement de jour)
    React.useEffect(() => {
      setLocalChapters(chapters);
    }, [chapters]);

    // Calculer la progression localement pour réactivité immédiate
    const localProgressPercentage = useMemo(() => {
      if (localChapters.length === 0) return 0;
      const completedCount = localChapters.filter((ch) => ch.completed).length;
      return Math.round((completedCount / localChapters.length) * 100);
    }, [localChapters]);

    const isComplete = localProgressPercentage === 100;

    // Formater la date
    const formattedDate = useMemo(() => {
      return new Date(date).toLocaleDateString("fr-FR", {
        weekday: "long",
        day: "numeric",
        month: "long",
      });
    }, [date]);

    // Handler pour toggle le statut d'un chapitre
    const handleToggleRead = useCallback(
      async (chapterId: string) => {
        if (!user) {
          toast.error("Vous devez être connecté");
          return;
        }

        const chapter = localChapters.find((ch) => ch.id === chapterId);
        if (!chapter) return;

        // MISE À JOUR OPTIMISTE LOCALE IMMÉDIATE
        const previousCompleted = chapter.completed;
        setLocalChapters((prev) =>
          prev.map((ch) =>
            ch.id === chapterId ? { ...ch, completed: !ch.completed } : ch
          )
        );

        try {
          setProcessingIds((prev) => [...prev, chapterId]);

          const result = await optimizedToggleChapterStatus(
            user.id,
            chapterId,
            previousCompleted ? "completed" : "pending",
            day,
          );

          if (result.success) {
            // Afficher les badges débloqués
            if (result.newBadges && result.newBadges.length > 0) {
              for (const badge of result.newBadges) {
                showBadgeUnlocked(badge);
              }
            }

            // Mise à jour du cache global
            queryClient.setQueryData(["optimized-reading-plan-data", user.id], (oldData: any[]) => {
              if (!oldData) return oldData;

              return oldData.map((dayData: any) => {
                if (dayData.day !== day) return dayData;

                const updatedChapters = dayData.chapters.map((ch: Chapter) => {
                  if (ch.id === chapterId) {
                    return { ...ch, completed: !previousCompleted };
                  }
                  return ch;
                });

                const completedCount = updatedChapters.filter((ch: Chapter) => ch.completed).length;
                const newProgressPercentage =
                  updatedChapters.length > 0 ? Math.round((completedCount / updatedChapters.length) * 100) : 0;

                return {
                  ...dayData,
                  chapters: updatedChapters,
                  progressPercentage: newProgressPercentage,
                  completed: newProgressPercentage === 100,
                };
              });
            });

            triggerProgressUpdate();
          } else {
            // ROLLBACK en cas d'échec
            setLocalChapters((prev) =>
              prev.map((ch) =>
                ch.id === chapterId ? { ...ch, completed: previousCompleted } : ch
              )
            );
            toast.error("Erreur lors de la mise à jour");
          }
        } catch (error) {
          console.error("Error toggling chapter:", error);
          // ROLLBACK en cas d'erreur
          setLocalChapters((prev) =>
            prev.map((ch) =>
              ch.id === chapterId ? { ...ch, completed: previousCompleted } : ch
            )
          );
          toast.error("Erreur lors de la mise à jour");
          queryClient.invalidateQueries({
            queryKey: ["optimized-reading-plan-data", user.id],
          });
        } finally {
          setProcessingIds((prev) => prev.filter((id) => id !== chapterId));
        }
      },
      [user, localChapters, day, queryClient, triggerProgressUpdate, showBadgeUnlocked],
    );

    // Handler pour marquer tous les passages comme lus
    const handleMarkAllRead = useCallback(async () => {
      if (!user || isMarkingAll) return;

      const uncompletedChapters = localChapters.filter((ch) => !ch.completed);
      if (uncompletedChapters.length === 0) {
        toast.info("Tous les passages sont déjà lus !");
        return;
      }

      // MISE À JOUR OPTIMISTE LOCALE IMMÉDIATE
      const previousChapters = [...localChapters];
      setLocalChapters((prev) =>
        prev.map((ch) => ({ ...ch, completed: true }))
      );

      setIsMarkingAll(true);

      try {
        const result = await markAllChaptersAsRead(
          user.id,
          uncompletedChapters.map((ch) => ch.id),
          day,
        );

        if (result.success) {
          queryClient.setQueryData(["optimized-reading-plan-data", user.id], (oldData: any[]) => {
            if (!oldData) return oldData;

            return oldData.map((dayData: any) => {
              if (dayData.day !== day) return dayData;

              const updatedChapters = dayData.chapters.map((ch: Chapter) => ({
                ...ch,
                completed: true,
              }));

              return {
                ...dayData,
                chapters: updatedChapters,
                progressPercentage: 100,
                completed: true,
              };
            });
          });

          triggerProgressUpdate();
          toast.success(
            `${uncompletedChapters.length} passage${uncompletedChapters.length > 1 ? "s" : ""} marqué${uncompletedChapters.length > 1 ? "s" : ""} comme lu${uncompletedChapters.length > 1 ? "s" : ""} !`,
          );
        } else {
          // ROLLBACK en cas d'échec
          setLocalChapters(previousChapters);
          toast.error("Erreur lors du marquage");
        }
      } catch (error) {
        console.error("Error marking all as read:", error);
        // ROLLBACK en cas d'erreur
        setLocalChapters(previousChapters);
        toast.error("Erreur lors du marquage");
        queryClient.invalidateQueries({
          queryKey: ["optimized-reading-plan-data", user.id],
        });
      } finally {
        setIsMarkingAll(false);
      }
    }, [user, localChapters, day, queryClient, triggerProgressUpdate, isMarkingAll]);

    return (
      <div className="bg-card rounded-2xl border border-border p-4 shadow-sm">
        {/* En-tête avec jour et badge */}
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-bold text-foreground">
              Jour {day} <span className="text-muted-foreground font-normal">sur {totalDays}</span>
            </h2>
            {isComplete && (
              <span className="bg-primary text-primary-foreground text-xs font-semibold px-2.5 py-1 rounded-full">
                À JOUR !
              </span>
            )}
          </div>
        <span className="text-sm font-medium text-muted-foreground">{localProgressPercentage}%</span>
      </div>

        {/* Date */}
        <p className="text-sm text-muted-foreground mb-4 capitalize">{formattedDate}</p>

        {/* Liste des chapitres */}
        <div className="space-y-3 mb-4">
          {localChapters.map((chapter) => {
            const isProcessing = processingIds.includes(chapter.id);

            return (
              <button
                key={chapter.id}
                onClick={() => handleToggleRead(chapter.id)}
                disabled={isProcessing}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-muted/50 hover:bg-muted transition-colors"
              >
                <div className="flex items-center gap-3">
                  {/* Checkbox */}
                  <div
                    className={`h-6 w-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                      chapter.completed ? "bg-primary border-primary" : "border-border hover:border-primary/50"
                    }`}
                  >
                    {isProcessing ? (
                      <Loader2 className="h-3.5 w-3.5 text-primary-foreground animate-spin" />
                    ) : (
                      chapter.completed && <Check className="h-3.5 w-3.5 text-primary-foreground" />
                    )}
                  </div>

                  {/* Référence */}
                  <span
                    className={`text-sm font-medium ${
                      chapter.completed ? "text-muted-foreground line-through" : "text-foreground"
                    }`}
                  >
                    {chapter.reference}
                  </span>
                </div>

                {/* Flèche de navigation */}
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </button>
            );
          })}
        </div>
      </div>
    );
  },
);

FocusDayDetail.displayName = "FocusDayDetail";

export default FocusDayDetail;
