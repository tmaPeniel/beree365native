/**
 * Types pour la progression de lecture
 */

export interface ProgressMetrics {
  totalPassages: number;
  passagesRead: number;
  passagesRemaining: number;
  progressPercentage: number;
  completedDays: number;
}

export interface DayProgress {
  dayNumber: number;
  percentage: number;
  isCompleted: boolean;
}
