
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
  targetDate.setDate(startDate.getDate() + (dayNumber - 1));
  
  // Formater au format ISO local
  const year = targetDate.getFullYear();
  const month = String(targetDate.getMonth() + 1).padStart(2, '0');
  const day = String(targetDate.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
};

/**
 * Calcule le numéro du jour actuel dans le plan de lecture
 * Version corrigée pour éviter les décalages d'un jour
 * @param startDateStr Date de début du plan (format ISO)
 * @returns Numéro du jour actuel (minimum 1)
 */
export const calculateCurrentDayNumber = (startDateStr: string): number => {
  console.log(`🔍 Calcul du jour courant - Date de début: ${startDateStr}`);
  
  // Parser la date de début en utilisant notre fonction robuste
  const startDate = parseLocalDate(startDateStr);
  console.log(`📅 Date de début parsée: ${startDate.toDateString()}`);
  
  // Obtenir la date d'aujourd'hui à minuit pour une comparaison précise
  const today = new Date();
  const todayNormalized = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  console.log(`📅 Aujourd'hui normalisé: ${todayNormalized.toDateString()}`);
  
  // Normaliser la date de début aussi (mettre à minuit)
  const startDateNormalized = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
  console.log(`📅 Date de début normalisée: ${startDateNormalized.toDateString()}`);
  
  // Calculer la différence en utilisant une méthode plus directe
  // Convertir en millisecondes puis en jours
  const diffTime = todayNormalized.getTime() - startDateNormalized.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  console.log(`⏰ Différence en millisecondes: ${diffTime}`);
  console.log(`📊 Différence en jours: ${diffDays}`);
  
  // Le jour courant est diffDays + 1 (car le jour 1 commence à la date de début)
  const currentDay = diffDays + 1;
  console.log(`🎯 Jour calculé (avant limitation): ${currentDay}`);
  
  // S'assurer que le jour est au minimum 1
  const finalDay = Math.max(1, currentDay);
  console.log(`✅ Jour final: ${finalDay}`);
  
  return finalDay;
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
