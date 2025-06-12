
/**
 * Point d'entrée pour les services du plan de lecture - VERSION UNIFIÉE
 * Exporte les fonctions de tous les services avec le système unifié
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

// Export des fonctions du service de progression unifié
export {
  getUserProgressForDay,
  toggleChapterStatus,
  getDayProgress,
  getOverallProgress,
  invalidateProgressCache,
  getUnifiedUserProgressForDay,
  unifiedToggleChapterStatus,
  getUnifiedDayProgress,
  getUnifiedOverallProgress,
  invalidateAllProgressCaches
} from './progressService';

// Export des services de statistiques unifiées
export {
  getDetailedUserStats,
  getQuickUserStats,
  getDayCompletionStats,
  invalidateStatsCache
} from './unifiedStatsService';

// Export du service de cache optimisé
export {
  getOptimizedReadingPlanData,
  invalidateUserCacheSelective,
  optimizedToggleChapterStatus
} from './optimizedCacheService';
