-- Mettre à jour le trigger handle_new_user pour gérer le plan sélectionné
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  default_plan_id UUID;
  user_plan_id UUID;
BEGIN
  -- Récupérer le plan par défaut (Plan Classique)
  SELECT id INTO default_plan_id 
  FROM public.reading_plans 
  WHERE name = 'Plan Classique' AND is_active = true
  LIMIT 1;
  
  -- Utiliser le plan fourni dans les métadonnées, sinon le plan par défaut
  user_plan_id := COALESCE(
    (NEW.raw_user_meta_data->>'plan_id')::UUID,
    default_plan_id
  );
  
  -- Insérer un profil pour le nouvel utilisateur
  INSERT INTO public.profiles (id, full_name, start_date, selected_plan_id)
  VALUES (
    NEW.id, 
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Nouvel utilisateur'), 
    COALESCE((NEW.raw_user_meta_data->>'start_date')::date, CURRENT_DATE),
    user_plan_id
  )
  ON CONFLICT (id) DO NOTHING;
  
  RETURN NEW;
END;
$$;