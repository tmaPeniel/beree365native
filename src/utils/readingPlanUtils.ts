
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

export const getTodayReadingPlan = (): ReadingDay => {
  // In a real app, you would determine which day it is in the plan
  // For demo purposes, return the first day
  return readingPlanData.days[0];
};

export const getReadingPlanStats = (): ReadingPlanStats => {
  const totalPassages = readingPlanData.totalPassages;
  
  // Count completed passages across all days
  let passagesRead = 0;
  readingPlanData.days.forEach(day => {
    day.passages.forEach(passage => {
      if (passage.completed) passagesRead++;
    });
  });
  
  const passagesRemaining = totalPassages - passagesRead;
  const progressPercentage = Math.round((passagesRead / totalPassages) * 100);
  
  return {
    totalPassages,
    passagesRead,
    passagesRemaining,
    progressPercentage
  };
};

export const calculateRemainingDays = (): number => {
  // In a real app, this would calculate based on the current date and end date
  // For demo, return a fixed value
  return 310;
};

export const getPlanDates = (): { startDate: Date; endDate: Date } => {
  const startDate = new Date("2025-01-01");
  const endDate = new Date("2025-12-31");
  return { startDate, endDate };
};

// Adding the missing formatDateToFrench function
export const formatDateToFrench = (date: Date): string => {
  const options: Intl.DateTimeFormatOptions = { 
    day: 'numeric', 
    month: 'long',
    year: 'numeric'
  };
  return date.toLocaleDateString('fr-FR', options);
};
