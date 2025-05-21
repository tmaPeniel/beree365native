
/**
 * Types pour les données de Supabase
 * Ces types représentent les structures de données utilisées dans l'application
 */

// Type pour le profil utilisateur
export type Profile = {
  id: string;
  full_name: string | null;
  start_date: string;
  created_at: string;
};

// Type pour les chapitres du plan de lecture
export type ReadingPlanChapter = {
  id: string;
  day_number: number;
  reference: string;
  description: string | null;
};

// Type pour le statut d'un chapitre
export type ChapterStatus = 'pending' | 'completed';

// Type pour la progression de l'utilisateur
export type UserProgress = {
  id: string;
  user_id: string;
  chapter_id: string;
  status: ChapterStatus;
  completed_at: string | null;
};

// Type pour le verset du jour
export type DailyVerse = {
  id: string;
  day_number: number;
  reference: string;
  text: string;
};
