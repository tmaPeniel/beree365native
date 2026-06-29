
/**
 * Point d'entrée pour les services du plan de lecture
 * Exporte les fonctions de tous les services liés au plan de lecture
 */

// Export des fonctions du service de chapitres
export {
  getReadingPlanForDay,
  calculateDayNumber
} from './chapterService';

// Export des fonctions du service de versets
export {
  getDailyVerse,
  getDefaultVerse,
  getAllVersesUpToDay
} from './verseService';

// Export des fonctions du service de progression
export {
  getUserProgressForDay,
  getUserReadingPlanProgress,
  toggleChapterStatus,
  getDayProgress,
  getOverallProgress
} from './progressService';
export type {
  ReadingPlanProgressDay,
  ReadingPlanProgressPassage
} from './progressService';
