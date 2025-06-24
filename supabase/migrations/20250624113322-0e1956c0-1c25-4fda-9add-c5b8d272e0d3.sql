
-- Recréer la fonction pour assigner le rôle par défaut
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

-- Supprimer le trigger existant s'il existe pour éviter les doublons
DROP TRIGGER IF EXISTS assign_user_role_trigger ON public.profiles;

-- Recréer le trigger sur la table profiles
CREATE TRIGGER assign_user_role_trigger
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.assign_default_user_role();

-- Corriger les utilisateurs existants qui n'ont pas de rôle
INSERT INTO public.user_roles (user_id, role)
SELECT p.id, 'user'::app_role
FROM public.profiles p
LEFT JOIN public.user_roles ur ON p.id = ur.user_id
WHERE ur.user_id IS NULL
ON CONFLICT (user_id, role) DO NOTHING;
