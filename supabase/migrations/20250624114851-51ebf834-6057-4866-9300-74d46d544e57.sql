
-- Étape 1 : Recréer les triggers manquants

-- D'abord, supprimer les triggers existants s'ils existent (pour éviter les conflits)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_profile_created ON public.profiles;

-- Recréer le trigger pour créer automatiquement un profil lors de l'inscription
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Recréer le trigger pour assigner automatiquement le rôle utilisateur après création du profil
CREATE TRIGGER on_profile_created
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.assign_default_user_role();

-- Étape 2 : Corriger les utilisateurs existants

-- Créer des profils pour les utilisateurs qui n'en ont pas
INSERT INTO public.profiles (id, full_name, start_date)
SELECT 
  au.id,
  COALESCE(au.raw_user_meta_data->>'full_name', 'Utilisateur'),
  COALESCE((au.raw_user_meta_data->>'start_date')::date, CURRENT_DATE)
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- Assigner le rôle "user" par défaut aux profils qui n'ont pas de rôle
INSERT INTO public.user_roles (user_id, role)
SELECT 
  p.id,
  'user'::app_role
FROM public.profiles p
LEFT JOIN public.user_roles ur ON p.id = ur.user_id
WHERE ur.user_id IS NULL
ON CONFLICT (user_id, role) DO NOTHING;
