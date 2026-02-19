-- Ajouter la colonne onesignal_player_id à la table profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS onesignal_player_id TEXT;