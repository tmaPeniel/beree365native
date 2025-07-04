
/**
 * Utilitaires centralisés pour les calculs de date du plan de lecture
 * Toutes les fonctions utilisent la même logique pour éviter les incohérences
 * CORRECTION COMPLÈTE du décalage de jour
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
  //console.log(`🔢 calculateDateForDay - Start: ${startDateStr}, Day: ${dayNumber}`);
  
  const startDate = parseLocalDate(startDateStr);
  
  // dayNumber commence à 1, donc on ajoute (dayNumber - 1) jours
  const targetDate = new Date(startDate);
  targetDate.setDate(startDate.getDate() + (dayNumber - 1));
  
  // Formater au format ISO local
  const year = targetDate.getFullYear();
  const month = String(targetDate.getMonth() + 1).padStart(2, '0');
  const day = String(targetDate.getDate()).padStart(2, '0');
  
  const result = `${year}-${month}-${day}`;
  //console.log(`🔢 calculateDateForDay - Result: ${result}`);
  
  return result;
};

/**
 * Calcule le numéro du jour actuel dans le plan de lecture
 * VERSION CORRIGÉE - Correction du +2 en +1
 * @param startDateStr Date de début du plan (format ISO)
 * @returns Numéro du jour actuel (minimum 1)
 */
export const calculateCurrentDayNumber = (startDateStr: string): number => {
  //console.log(`🔍 === CALCUL DU JOUR COURANT - DÉBUT ===`);
  //console.log(`🔍 Date de début reçue: ${startDateStr}`);
  
  // Parser la date de début
  const startDate = parseLocalDate(startDateStr);
  //console.log(`📅 Date de début parsée: ${startDate.toDateString()} (${startDate.toISOString()})`);
  
  // Obtenir la date d'aujourd'hui et la normaliser à minuit
  const today = new Date();
  const todayNormalized = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  //console.log(`📅 Aujourd'hui: ${today.toDateString()} (${today.toISOString()})`);
  //console.log(`📅 Aujourd'hui normalisé: ${todayNormalized.toDateString()} (${todayNormalized.toISOString()})`);
  
  // Normaliser aussi la date de début à minuit
  const startDateNormalized = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
  //console.log(`📅 Date de début normalisée: ${startDateNormalized.toDateString()} (${startDateNormalized.toISOString()})`);
  
  // CORRECTION PRINCIPALE: Calculer la différence correctement
  // Si aujourd'hui = date de début, c'est le jour 1 (pas le jour 0)
  const diffTime = todayNormalized.getTime() - startDateNormalized.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  //console.log(`⏰ Différence en millisecondes: ${diffTime}`);
  //console.log(`📊 Différence en jours: ${diffDays}`);
  
  // CORRECTION: Le jour 1 commence à la date de début (diffDays = 0 = jour 1)
  const currentDay = diffDays + 1; // Corrigé de +2 à +1
  //console.log(`🎯 Jour calculé (diffDays + 1): ${currentDay}`);
  
  // S'assurer que le jour est entre 1 et 365
  const finalDay = Math.max(1, Math.min(currentDay, 365));
  //console.log(`✅ Jour final (limité 1-365): ${finalDay}`);
  
  // Test de vérification
  const calculatedDateForFinalDay = calculateDateForDay(startDateStr, finalDay);
  const todayFormatted = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  //console.log(`🧪 Vérification: Jour ${finalDay} → ${calculatedDateForFinalDay}`);
  //console.log(`🧪 Aujourd'hui formaté: ${todayFormatted}`);
  //console.log(`🧪 Match: ${calculatedDateForFinalDay === todayFormatted ? '✅' : '❌'}`);
  
  //console.log(`🔍 === CALCUL DU JOUR COURANT - FIN ===`);
  
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
  
  const result = calculatedDate === todayStr;
  //console.log(`🔍 isToday - Jour ${dayNumber}: ${calculatedDate} === ${todayStr} → ${result}`);
  
  return result;
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

/**
 * Synchronise le jour de la DB avec le calcul de date
 * @param startDateStr Date de début du plan (format ISO)
 * @returns Le jour calculé selon la date
 */
export const getCalculatedCurrentDay = (startDateStr: string): number => {
  return calculateCurrentDayNumber(startDateStr);
};
