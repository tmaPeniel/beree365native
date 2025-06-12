
/**
 * Service centralisé pour la gestion des dates et jours du plan de lecture
 * VERSION CORRIGÉE - Une seule source de vérité basée sur la date
 * Utilise un calcul unifié pour la cohérence entre tous les composants
 */

/**
 * Parse une date ISO en forçant le fuseau horaire local
 * Évite les problèmes de décalage horaire
 */
const parseLocalDate = (dateStr: string): Date => {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
};

/**
 * Calcule le numéro du jour actuel dans le plan de lecture
 * VERSION CORRIGÉE - Calcul unifié pour tous les composants
 * 
 * @param startDateStr Date de début du plan au format ISO (YYYY-MM-DD)
 * @returns Numéro du jour (1-365)
 */
export const getCurrentDayNumber = (startDateStr: string): number => {
  console.log(`📅 Calcul unifié du jour courant - Date de début: ${startDateStr}`);
  
  const startDate = parseLocalDate(startDateStr);
  const today = new Date();
  
  // Normaliser les dates à minuit pour éviter les problèmes d'heures
  const startDateNormalized = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate(), 0, 0, 0);
  const todayNormalized = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0);
  
  // Calculer la différence en jours
  const diffTime = todayNormalized.getTime() - startDateNormalized.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  // CORRECTION: Le jour 1 commence à la date de début (diffDays = 0 = jour 1)
  // Donc currentDay = diffDays + 1 (et non + 2)
  const currentDay = diffDays + 1;
  
  // Limiter entre 1 et 365
  const finalDay = Math.max(1, Math.min(currentDay, 365));
  
  console.log(`📅 Calcul unifié: diffDays=${diffDays}, jour final=${finalDay}`);
  
  return finalDay;
};

/**
 * Calcule la date pour un jour donné du plan de lecture
 * Utilisé pour afficher les dates dans l'interface
 * 
 * @param startDateStr Date de début au format ISO
 * @param dayNumber Numéro du jour (1-365)
 * @returns Date au format ISO (YYYY-MM-DD)
 */
export const getDateForDay = (startDateStr: string, dayNumber: number): string => {
  const startDate = parseLocalDate(startDateStr);
  const targetDate = new Date(startDate);
  targetDate.setDate(startDate.getDate() + (dayNumber - 1));
  
  const year = targetDate.getFullYear();
  const month = String(targetDate.getMonth() + 1).padStart(2, '0');
  const day = String(targetDate.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
};

/**
 * Vérifie si un jour donné correspond à aujourd'hui
 * Utilisé pour mettre en évidence le jour courant
 * 
 * @param startDateStr Date de début du plan
 * @param dayNumber Numéro du jour à vérifier
 * @returns true si le jour correspond à aujourd'hui
 */
export const isToday = (startDateStr: string, dayNumber: number): boolean => {
  const calculatedDate = getDateForDay(startDateStr, dayNumber);
  const today = new Date();
  
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  const todayStr = `${year}-${month}-${day}`;
  
  return calculatedDate === todayStr;
};

/**
 * Formate une date au format français
 * Utilisé pour l'affichage dans l'interface utilisateur
 * 
 * @param dateStr Date au format ISO
 * @returns Date formatée en français (ex: "15 janv")
 */
export const formatDateToFrench = (dateStr: string): string => {
  const date = parseLocalDate(dateStr);
  return date.toLocaleDateString('fr-FR', { 
    day: 'numeric', 
    month: 'short' 
  });
};

/**
 * Calcule les statistiques du plan de lecture
 * Fournit une vue d'ensemble de la progression basée sur les dates
 * 
 * @param startDateStr Date de début du plan
 * @returns Statistiques du plan (jour courant, jours restants, etc.)
 */
export const getPlanStats = (startDateStr: string) => {
  const currentDay = getCurrentDayNumber(startDateStr);
  const remainingDays = Math.max(0, 365 - currentDay);
  const progressPercentage = Math.round((currentDay / 365) * 100);
  
  return {
    currentDay,
    remainingDays,
    progressPercentage,
    totalDays: 365
  };
};
