
-- Supprimer le trigger et la fonction qui causent le problème d'inscription
-- en pré-remplissant la table user_progress

-- Supprimer le trigger qui s'exécute après la création d'un profil
DROP TRIGGER IF EXISTS on_profile_created ON public.profiles;

-- Supprimer la fonction qui initialise la progression
DROP FUNCTION IF EXISTS public.setup_user_initial_progress();

-- Garder seulement le trigger pour créer le profil utilisateur
-- (le trigger on_auth_user_created et la fonction handle_new_user restent inchangés)
