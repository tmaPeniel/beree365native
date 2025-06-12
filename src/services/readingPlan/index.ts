
/**
 * Point d'entrée pour les services du plan de lecture
 * VERSION OPTIMISÉE - Exporte les services unifiés et optimisés
 */

// Export des fonctions du service de chapitres
export {
  getReadingPlanForDay,
  calculateDayNumber
} from './chapterService';

// Export des fonctions du service de versets
export {
  getDailyVerse,
  getDefaultVerse
} from './verseService';

// Export des fonctions du service de progression (optimisé)
export {
  getUserProgressForDay,
  toggleChapterStatus,
  getDayProgress,
  getOverallProgress,
  type DayProgressWithChapters
} from './progressService';

// Export des nouveaux services unifiés pour usage avancé
export {
  getUnifiedStats,
  calculateCompletedDays,
  isDayFullyCompleted,
  getDayProgressPercentage,
  type UnifiedStats
} from './unifiedStatsService';

export {
  getUnifiedUserProgressForDay,
  toggleUnifiedChapterStatus,
  invalidateProgressCache,
  getMultipleDaysProgress
} from './unifiedProgressService';
