
-- Ajouter un rôle 'user' automatiquement lors de la création d'un profil utilisateur
CREATE OR REPLACE FUNCTION public.assign_default_user_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Insérer automatiquement le rôle 'user' pour le nouvel utilisateur
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user'::app_role)
  ON CONFLICT (user_id, role) DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- Créer le trigger qui s'exécute après la création d'un profil
CREATE TRIGGER on_profile_assign_default_role
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.assign_default_user_role();
