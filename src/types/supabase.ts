
export type Profile = {
  id: string;
  full_name: string | null;
  start_date: string;
  created_at: string;
};

export type ReadingPlanChapter = {
  id: string;
  day_number: number;
  reference: string;
  description: string | null;
};

export type ChapterStatus = 'pending' | 'completed';

export type UserProgress = {
  id: string;
  user_id: string;
  chapter_id: string;
  status: ChapterStatus;
  completed_at: string | null;
};

export type DailyVerse = {
  id: string;
  day_number: number;
  reference: string;
  text: string;
};
