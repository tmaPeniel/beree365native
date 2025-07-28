-- Créer une table pour les types de badges disponibles
CREATE TABLE public.badges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  icon TEXT NOT NULL, -- URL ou nom d'icône
  color TEXT NOT NULL DEFAULT '#3B82F6', -- Couleur du badge en hex
  criteria JSONB NOT NULL, -- Critères pour débloquer le badge
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Créer une table pour les badges débloqués par les utilisateurs
CREATE TABLE public.user_badges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  badge_id UUID NOT NULL REFERENCES public.badges(id) ON DELETE CASCADE,
  unlocked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, badge_id)
);

-- Activer RLS sur les deux tables
ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;

-- Politiques RLS pour la table badges (lecture publique)
CREATE POLICY "Everyone can view badges" 
ON public.badges 
FOR SELECT 
USING (true);

-- Politiques RLS pour la table user_badges
CREATE POLICY "Users can view their own badges" 
ON public.user_badges 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own badges" 
ON public.user_badges 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Fonction pour calculer les badges débloqués automatiquement
CREATE OR REPLACE FUNCTION public.calculate_user_badges(_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  _user_progress INTEGER;
  _completed_days INTEGER;
  _consecutive_days INTEGER;
  _badge_record RECORD;
BEGIN
  -- Récupérer les statistiques de l'utilisateur
  SELECT 
    COUNT(*) FILTER (WHERE status = 'completed') as progress_count,
    get_completed_days_count(_user_id) as completed_days_count
  INTO _user_progress, _completed_days
  FROM user_progress 
  WHERE user_id = _user_id;
  
  -- Pour chaque badge, vérifier si l'utilisateur répond aux critères
  FOR _badge_record IN 
    SELECT id, criteria 
    FROM badges 
  LOOP
    -- Vérifier si le badge n'est pas déjà débloqué
    IF NOT EXISTS (
      SELECT 1 FROM user_badges 
      WHERE user_id = _user_id AND badge_id = _badge_record.id
    ) THEN
      -- Logique pour différents types de badges
      IF (_badge_record.criteria ->> 'type' = 'chapters_read' AND 
          _user_progress >= (_badge_record.criteria ->> 'count')::INTEGER) OR
         (_badge_record.criteria ->> 'type' = 'days_completed' AND 
          _completed_days >= (_badge_record.criteria ->> 'count')::INTEGER) OR
         (_badge_record.criteria ->> 'type' = 'milestone' AND 
          _completed_days >= (_badge_record.criteria ->> 'count')::INTEGER)
      THEN
        -- Débloquer le badge
        INSERT INTO user_badges (user_id, badge_id)
        VALUES (_user_id, _badge_record.id)
        ON CONFLICT (user_id, badge_id) DO NOTHING;
      END IF;
    END IF;
  END LOOP;
END;
$$;

-- Insérer quelques badges par défaut
INSERT INTO public.badges (name, description, icon, color, criteria) VALUES 
('Premier pas', 'Complétez votre premier chapitre', '🎯', '#10B981', '{"type": "chapters_read", "count": 1}'),
('Lecteur assidu', 'Lisez 10 chapitres', '📖', '#3B82F6', '{"type": "chapters_read", "count": 10}'),
('Marathon', 'Lisez 50 chapitres', '🏃‍♂️', '#8B5CF6', '{"type": "chapters_read", "count": 50}'),
('Première semaine', 'Complétez 7 jours de lecture', '📅', '#F59E0B', '{"type": "days_completed", "count": 7}'),
('Premier mois', 'Complétez 30 jours de lecture', '🗓️', '#EF4444', '{"type": "days_completed", "count": 30}'),
('Trimestre accompli', 'Complétez 90 jours de lecture', '🎊', '#EC4899', '{"type": "days_completed", "count": 90}'),
('Demi-année', 'Complétez 180 jours de lecture', '🏆', '#F97316', '{"type": "days_completed", "count": 180}'),
('Année complète', 'Terminez les 365 jours du plan', '👑', '#FFD700', '{"type": "days_completed", "count": 365}');