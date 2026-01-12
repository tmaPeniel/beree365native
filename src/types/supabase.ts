
/**
 * Types pour les données de Supabase
 * Ces types représentent les structures de données utilisées dans l'application
 */

// Type pour le profil utilisateur
export type Profile = {
  id: string;
  full_name: string | null;
  start_date: string;
  current_day_number: number;
  created_at: string;
  last_login_at?: string | null;
  is_active?: boolean | null;
  selected_plan_id: string; // Nouveau champ
};

// Type pour les plans de lecture
export type ReadingPlan = {
  id: string;
  name: string;
  description: string | null;
  duration_days: number;
  is_active: boolean;
  created_at: string;
};

// Type pour les chapitres du plan de lecture
export type ReadingPlanChapter = {
  id: string;
  day_number: number;
  reference: string;
  description: string | null;
  plan_id: string; // Nouveau champ
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
  wisdomType: string | null;
  likes_count?: number;
};

// Nouveaux types pour l'administration
export type AppRole = 'admin' | 'user';

export type UserRole = {
  id: string;
  user_id: string;
  role: AppRole;
  created_at: string;
};

export type UserStats = {
  user_id: string;
  full_name: string | null;
  email: string; // Type mis à jour pour correspondre à VARCHAR(255) de la DB
  start_date: string | null;
  last_login_at: string | null;
  is_active: boolean | null;
  completed_chapters_count: number;
  total_days_completed: number;
};
