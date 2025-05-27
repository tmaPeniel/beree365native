
/**
 * Utilitaires centralisés pour les calculs de date du plan de lecture
 * Toutes les fonctions utilisent la même logique pour éviter les incohérences
 */

/**
 * Calcule la date pour un jour donné du plan de lecture
 * @param startDateStr Date de début du plan (format ISO)
 * @param dayNumber Numéro du jour dans le plan (1-365)
 * @returns Date calculée au format ISO (YYYY-MM-DD)
 */
export const calculateDateForDay = (startDateStr: string, dayNumber: number): string => {
  const startDate = new Date(startDateStr);
  startDate.setHours(0, 0, 0, 0);
  
  // dayNumber commence à 1, donc on ajoute (dayNumber - 1) jours
  const targetDate = new Date(startDate);
  targetDate.setDate(startDate.getDate() + (dayNumber - 1));
  
  return targetDate.toISOString().split('T')[0];
};

/**
 * Calcule le numéro du jour actuel dans le plan de lecture
 * @param startDateStr Date de début du plan (format ISO)
 * @returns Numéro du jour actuel (minimum 1)
 */
export const calculateCurrentDayNumber = (startDateStr: string): number => {
  const startDate = new Date(startDateStr);
  const today = new Date();
  
  // Normaliser les heures pour une comparaison précise
  today.setHours(0, 0, 0, 0);
  startDate.setHours(0, 0, 0, 0);
  
  const diffTime = today.getTime() - startDate.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  return Math.max(1, diffDays + 1);
};

/**
 * Vérifie si un jour donné correspond à aujourd'hui
 * @param startDateStr Date de début du plan (format ISO)
 * @param dayNumber Numéro du jour dans le plan
 * @returns true si c'est le jour actuel
 */
export const isToday = (startDateStr: string, dayNumber: number): boolean => {
  const calculatedDate = calculateDateForDay(startDateStr, dayNumber);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const targetDate = new Date(calculatedDate);
  targetDate.setHours(0, 0, 0, 0);
  
  return targetDate.getTime() === today.getTime();
};

/**
 * Formate une date au format français court (ex: "30 mars")
 * @param dateStr Date au format ISO
 * @returns Date formatée en français
 */
export const formatDateToFrench = (dateStr: string): string => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('fr-FR', { 
    day: 'numeric', 
    month: 'short' 
  });
};
