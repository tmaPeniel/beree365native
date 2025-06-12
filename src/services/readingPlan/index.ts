
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
  getDefaultVerse
} from './verseService';

// Export des fonctions du service de progression
export {
  getUserProgressForDay,
  toggleChapterStatus,
  getDayProgress,
  getOverallProgress
} from './progressService';
