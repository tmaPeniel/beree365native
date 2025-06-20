
-- Migration pour supprimer le trigger problématique qui pré-remplissait user_progress
-- Cette migration a déjà été exécutée avec succès

-- Supprimer le trigger qui s'exécute après la création d'un profil
DROP TRIGGER IF EXISTS on_profile_created ON public.profiles;

-- Supprimer la fonction qui initialise la progression
DROP FUNCTION IF EXISTS public.setup_user_initial_progress();

-- Le trigger on_auth_user_created et la fonction handle_new_user restent inchangés
-- pour continuer à créer automatiquement le profil utilisateur lors de l'inscription
