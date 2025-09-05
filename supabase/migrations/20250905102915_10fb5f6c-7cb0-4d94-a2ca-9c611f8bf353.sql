-- Créer la table des plans de lecture
CREATE TABLE public.reading_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  duration_days INTEGER NOT NULL DEFAULT 365,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Insérer des plans d'exemple
INSERT INTO public.reading_plans (name, description, duration_days) VALUES
('Plan Classique', 'Lecture de la Bible en 365 jours avec un équilibre entre Ancien et Nouveau Testament', 365),
('Plan Nouveau Testament', 'Lecture complète du Nouveau Testament en 180 jours', 180),
('Plan Évangiles', 'Focus sur les quatre Évangiles en 90 jours', 90),
('Plan Psaumes et Proverbes', 'Méditation quotidienne sur la sagesse biblique en 150 jours', 150);

-- Ajouter plan_id à reading_plan_chapters
ALTER TABLE public.reading_plan_chapters 
ADD COLUMN plan_id UUID;

-- Récupérer l'ID du plan classique pour la migration
DO $$
DECLARE
    default_plan_id UUID;
BEGIN
    SELECT id INTO default_plan_id 
    FROM public.reading_plans 
    WHERE name = 'Plan Classique';
    
    -- Assigner tous les chapitres existants au plan classique
    UPDATE public.reading_plan_chapters 
    SET plan_id = default_plan_id;
END $$;

-- Rendre plan_id obligatoire et ajouter la clé étrangère
ALTER TABLE public.reading_plan_chapters 
ALTER COLUMN plan_id SET NOT NULL,
ADD CONSTRAINT fk_reading_plan_chapters_plan 
FOREIGN KEY (plan_id) REFERENCES public.reading_plans(id) ON DELETE CASCADE;

-- Ajouter selected_plan_id au profil utilisateur
ALTER TABLE public.profiles 
ADD COLUMN selected_plan_id UUID;

-- Assigner le plan classique à tous les utilisateurs existants
DO $$
DECLARE
    default_plan_id UUID;
BEGIN
    SELECT id INTO default_plan_id 
    FROM public.reading_plans 
    WHERE name = 'Plan Classique';
    
    UPDATE public.profiles 
    SET selected_plan_id = default_plan_id;
END $$;

-- Rendre selected_plan_id obligatoire et ajouter la clé étrangère
ALTER TABLE public.profiles 
ALTER COLUMN selected_plan_id SET NOT NULL,
ADD CONSTRAINT fk_profiles_selected_plan 
FOREIGN KEY (selected_plan_id) REFERENCES public.reading_plans(id) ON DELETE RESTRICT;

-- Politiques RLS pour reading_plans
ALTER TABLE public.reading_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view active reading plans" 
ON public.reading_plans 
FOR SELECT 
USING (is_active = true);

CREATE POLICY "Only admins can manage reading plans" 
ON public.reading_plans 
FOR ALL 
USING (public.is_admin());

-- Fonction RPC pour changer de plan
CREATE OR REPLACE FUNCTION public.change_user_plan(new_plan_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Vérifier que l'utilisateur est authentifié
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated';
  END IF;
  
  -- Vérifier que le plan existe et est actif
  IF NOT EXISTS (
    SELECT 1 FROM public.reading_plans 
    WHERE id = new_plan_id AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Plan not found or inactive';
  END IF;
  
  -- Supprimer toute la progression de l'utilisateur
  DELETE FROM public.user_progress 
  WHERE user_id = auth.uid();
  
  -- Supprimer tous les badges de l'utilisateur
  DELETE FROM public.user_badges 
  WHERE user_id = auth.uid();
  
  -- Mettre à jour le profil utilisateur
  UPDATE public.profiles 
  SET 
    selected_plan_id = new_plan_id,
    start_date = CURRENT_DATE,
    current_day_number = 1
  WHERE id = auth.uid();
END;
$$;