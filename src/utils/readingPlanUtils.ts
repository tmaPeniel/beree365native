
/**
 * Utilitaires pour le plan de lecture
 * Ces fonctions aident à gérer les données du plan de lecture et les calculs associés
 */

import readingPlanData from '../data/readingPlan.json';

export interface ReadingItem {
  id: string;
  reference: string;
  completed: boolean;
}

export interface VerseOfDay {
  text: string;
  reference: string;
}

export interface ReadingDay {
  id: number;
  date: string;
  passages: ReadingItem[];
  verseOfDay: VerseOfDay;
}

export interface ReadingPlanStats {
  totalPassages: number;
  passagesRead: number;
  passagesRemaining: number;
  progressPercentage: number;
}


/**
 * Calcule le nombre de jours restants dans le plan de lecture
 * @returns {number} Le nombre de jours restants
 */
export const calculateRemainingDays = (): number => {
  // Dans une application réelle, cela serait calculé en fonction de la date actuelle et de la date de fin
  // Pour la démonstration, renvoie une valeur fixe
  return 310;
};

/**
 * Récupère les dates de début et de fin du plan de lecture
 * @returns {{startDate: Date, endDate: Date}} Les dates de début et de fin du plan
 */
export const getPlanDates = (): { startDate: Date; endDate: Date } => {
  const startDate = new Date("2025-01-01");
  const endDate = new Date("2025-12-31");
  return { startDate, endDate };
};

/**
 * Formate une date au format français (ex: 1 janvier 2025)
 * @param {Date} date La date à formater
 * @returns {string} La date formatée en français
 */
export const formatDateToFrench = (date: Date): string => {
  const options: Intl.DateTimeFormatOptions = { 
    day: 'numeric', 
    month: 'long',
    year: 'numeric'
  };
  return date.toLocaleDateString('fr-FR', options);
};
