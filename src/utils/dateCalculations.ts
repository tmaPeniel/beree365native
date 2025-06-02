
/**
 * Utilitaires centralisés pour les calculs de date du plan de lecture
 * Toutes les fonctions utilisent la même logique pour éviter les incohérences
 * Correction du décalage de fuseau horaire
 */

/**
 * Parse une date ISO en forçant le fuseau horaire local
 * @param dateStr Date au format ISO (YYYY-MM-DD)
 * @returns Objet Date en fuseau horaire local
 */
const parseLocalDate = (dateStr: string): Date => {
  const [year, month, day] = dateStr.split('-').map(Number);
  // Mois - 1 car JavaScript utilise 0-11 pour les mois
  return new Date(year, month - 1, day);
};

/**
 * Calcule la date pour un jour donné du plan de lecture
 * @param startDateStr Date de début du plan (format ISO)
 * @param dayNumber Numéro du jour dans le plan (1-365)
 * @returns Date calculée au format ISO (YYYY-MM-DD)
 */
export const calculateDateForDay = (startDateStr: string, dayNumber: number): string => {
  const startDate = parseLocalDate(startDateStr);
  
  // dayNumber commence à 1, donc on ajoute (dayNumber - 1) jours
  const targetDate = new Date(startDate);
  targetDate.setDate(startDate.getDate() + (dayNumber));
  
  // Formater au format ISO local
  const year = targetDate.getFullYear();
  const month = String(targetDate.getMonth() + 1).padStart(2, '0');
  const day = String(targetDate.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
};

/**
 * Calcule le numéro du jour actuel dans le plan de lecture
 * @param startDateStr Date de début du plan (format ISO)
 * @returns Numéro du jour actuel (minimum 1)
 */
export const calculateCurrentDayNumber = (startDateStr: string): number => {
  const startDate = parseLocalDate(startDateStr);
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
  
  // Formater la date d'aujourd'hui au format ISO local
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  const todayStr = `${year}-${month}-${day}`;
  
  return calculatedDate === todayStr;
};

/**
 * Formate une date au format français court (ex: "30 mars")
 * @param dateStr Date au format ISO
 * @returns Date formatée en français
 */
export const formatDateToFrench = (dateStr: string): string => {
  const date = parseLocalDate(dateStr);
  return date.toLocaleDateString('fr-FR', { 
    day: 'numeric', 
    month: 'short' 
  });
};
