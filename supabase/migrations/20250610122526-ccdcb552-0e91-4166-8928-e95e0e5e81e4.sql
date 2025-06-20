
-- Vérifier et recréer les triggers si nécessaire
-- D'abord, supprimer les triggers existants s'ils existent
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_profile_created ON public.profiles;

-- Recréer le trigger pour créer automatiquement un profil lors de l'inscription
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Insérer un profil pour le nouvel utilisateur
  INSERT INTO public.profiles (id, full_name, start_date)
  VALUES (
    NEW.id, 
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Nouvel utilisateur'), 
    COALESCE((NEW.raw_user_meta_data->>'start_date')::date, CURRENT_DATE)
  )
  ON CONFLICT (id) DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- Créer le trigger qui s'exécute après l'insertion d'un utilisateur
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Créer la fonction pour initialiser la progression de l'utilisateur
CREATE OR REPLACE FUNCTION public.setup_user_initial_progress()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Insérer les entrées de progression pour tous les chapitres
  INSERT INTO public.user_progress (user_id, chapter_id, status)
  SELECT NEW.id, rpc.id, 'pending'::chapter_status
  FROM public.reading_plan_chapters rpc
  ON CONFLICT DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- Créer le trigger qui s'exécute après la création d'un profil
CREATE TRIGGER on_profile_created
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.setup_user_initial_progress();
