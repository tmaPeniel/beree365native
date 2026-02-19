-- Insert new badges with idempotency (skip if already exists)
DO $$
DECLARE
BEGIN
  -- Noble Béréen (streak 7 days - requires new logic)
  INSERT INTO public.badges (name, description, icon, color, criteria)
  SELECT 'Noble Béréen', 'Lecture quotidienne pendant 7 jours consécutifs', '📖✨', '#3B82F6', jsonb_build_object('type','streak_days','count',7)
  WHERE NOT EXISTS (SELECT 1 FROM public.badges WHERE name = 'Noble Béréen');

  -- Chercheur des Écritures (7 days completed)
  INSERT INTO public.badges (name, description, icon, color, criteria)
  SELECT 'Chercheur des Écritures', 'A lu tous les passages d\'une semaine', '🔍📜', '#10B981', jsonb_build_object('type','days_completed','count',7)
  WHERE NOT EXISTS (SELECT 1 FROM public.badges WHERE name = 'Chercheur des Écritures');

  -- Discipliné comme Paul (streak 30 days - requires new logic)
  INSERT INTO public.badges (name, description, icon, color, criteria)
  SELECT 'Discipliné comme Paul', 'A lu 30 jours d’affilée', '🛡️📅', '#8B5CF6', jsonb_build_object('type','streak_days','count',30)
  WHERE NOT EXISTS (SELECT 1 FROM public.badges WHERE name = 'Discipliné comme Paul');

  -- Fidèle témoin (30 days completed)
  INSERT INTO public.badges (name, description, icon, color, criteria)
  SELECT 'Fidèle témoin', 'A complété un mois complet du plan de lecture', '📆🙏', '#F59E0B', jsonb_build_object('type','days_completed','count',30)
  WHERE NOT EXISTS (SELECT 1 FROM public.badges WHERE name = 'Fidèle témoin');

  -- Lumière de la Parole (same hour 14 days - requires new logic)
  INSERT INTO public.badges (name, description, icon, color, criteria)
  SELECT 'Lumière de la Parole', 'A lu chaque jour à la même heure pendant 14 jours', '💡📖', '#06B6D4', jsonb_build_object('type','fixed_time_streak','count',14)
  WHERE NOT EXISTS (SELECT 1 FROM public.badges WHERE name = 'Lumière de la Parole');

  -- Marcheur persévérant (100 passages/chapters)
  INSERT INTO public.badges (name, description, icon, color, criteria)
  SELECT 'Marcheur persévérant', 'A lu plus de 100 passages', '👣⏳', '#EF4444', jsonb_build_object('type','chapters_read','count',100)
  WHERE NOT EXISTS (SELECT 1 FROM public.badges WHERE name = 'Marcheur persévérant');

  -- Gardien de la Vérité (resume after 3+ days gap - requires new logic)
  INSERT INTO public.badges (name, description, icon, color, criteria)
  SELECT 'Gardien de la Vérité', 'A repris la lecture après une pause de +3 jours', '🔁🕊️', '#A3E635', jsonb_build_object('type','resume_after_gap','days',3)
  WHERE NOT EXISTS (SELECT 1 FROM public.badges WHERE name = 'Gardien de la Vérité');

  -- Disciple silencieux (streak 21 days - requires new logic)
  INSERT INTO public.badges (name, description, icon, color, criteria)
  SELECT 'Disciple silencieux', 'A lu sans rater un seul jour pendant 3 semaines', '🤫📘', '#EC4899', jsonb_build_object('type','streak_days','count',21)
  WHERE NOT EXISTS (SELECT 1 FROM public.badges WHERE name = 'Disciple silencieux');

  -- Compagnon de Béréos (encouragements used - requires new logic)
  INSERT INTO public.badges (name, description, icon, color, criteria)
  SELECT 'Compagnon de Béréos', 'A utilisé les encouragements du Béréen 10 fois', '🤝🧙‍♂️', '#22C55E', jsonb_build_object('type','encouragements_used','count',10)
  WHERE NOT EXISTS (SELECT 1 FROM public.badges WHERE name = 'Compagnon de Béréos');

  -- Lecteur du matin (time before 7 for 7 days - requires new logic)
  INSERT INTO public.badges (name, description, icon, color, criteria)
  SELECT 'Lecteur du matin', 'A lu avant 7h pendant 7 jours', '🌅☕', '#F97316', jsonb_build_object('type','time_of_day','when','before_07','count',7)
  WHERE NOT EXISTS (SELECT 1 FROM public.badges WHERE name = 'Lecteur du matin');

  -- Gardien du soir (time after 21 for 7 days - requires new logic)
  INSERT INTO public.badges (name, description, icon, color, criteria)
  SELECT 'Gardien du soir', 'A lu après 21h pendant 7 jours', '🌙📖', '#0EA5E9', jsonb_build_object('type','time_of_day','when','after_21','count',7)
  WHERE NOT EXISTS (SELECT 1 FROM public.badges WHERE name = 'Gardien du soir');

  -- Lecteur des Actes (book completed - requires new logic)
  INSERT INTO public.badges (name, description, icon, color, criteria)
  SELECT 'Lecteur des Actes', 'A complété le livre des Actes', '🕊️📘', '#64748B', jsonb_build_object('type','book_completed','book','Acts')
  WHERE NOT EXISTS (SELECT 1 FROM public.badges WHERE name = 'Lecteur des Actes');

  -- Finisseur de parcours (full plan completed - will work if count matches total plan days)
  INSERT INTO public.badges (name, description, icon, color, criteria)
  SELECT 'Finisseur de parcours', 'A terminé tout le plan de lecture', '🏁📚', '#16A34A', jsonb_build_object('type','milestone','count',365)
  WHERE NOT EXISTS (SELECT 1 FROM public.badges WHERE name = 'Finisseur de parcours');
END $$;