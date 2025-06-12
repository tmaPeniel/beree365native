
/**
 * Service de progression principal - VERSION UNIFIÉE
 * Point d'entrée principal pour toutes les opérations de progression
 * Utilise le service unifié pour assurer la cohérence
 */

import { 
  getUnifiedUserProgressForDay,
  unifiedToggleChapterStatus,
  getUnifiedDayProgress,
  getUnifiedOverallProgress,
  invalidateAllProgressCaches
} from './unifiedProgressService';

// Exports principaux pour la compatibilité
export { 
  getUnifiedUserProgressForDay as getUserProgressForDay,
  unifiedToggleChapterStatus as toggleChapterStatus,
  getUnifiedDayProgress as getDayProgress,
  getUnifiedOverallProgress as getOverallProgress,
  invalidateAllProgressCaches as invalidateProgressCache
};

// Exports supplémentaires pour les nouveaux composants
export {
  getUnifiedUserProgressForDay,
  unifiedToggleChapterStatus,
  getUnifiedDayProgress,
  getUnifiedOverallProgress,
  invalidateAllProgressCaches
} from './unifiedProgressService';

/**
 * @deprecated Utiliser getUnifiedUserProgressForDay à la place
 */
export const getCachedUserProgressForDay = getUnifiedUserProgressForDay;

/**
 * @deprecated Utiliser unifiedToggleChapterStatus à la place
 */
export const optimizedToggleChapterStatus = unifiedToggleChapterStatus;
