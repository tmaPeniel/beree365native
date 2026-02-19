-- Migration: Ajouter support Capacitor pour les notifications
-- Ajoute les colonnes device_platform et device_token à la table profiles
-- La colonne onesignal_player_id est conservée pour la compatibilité

-- Ajouter la colonne device_platform pour identifier la plateforme (ios, android, web)
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS device_platform VARCHAR(20);

-- Ajouter un commentaire pour la colonne
COMMENT ON COLUMN public.profiles.device_platform IS 'Plateforme de l''appareil: ios, android, web';

-- Ajouter la colonne device_token pour stocker le token FCM (Android) ou APNs (iOS)
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS device_token TEXT;

-- Ajouter un commentaire pour la colonne
COMMENT ON COLUMN public.profiles.device_token IS 'Token de notification push (FCM pour Android, APNs pour iOS)';

-- Créer un index sur device_token pour améliorer les performances de recherche
CREATE INDEX IF NOT EXISTS idx_profiles_device_token ON public.profiles(device_token);

-- Créer un index sur device_platform pour améliorer les performances de filtrage
CREATE INDEX IF NOT EXISTS idx_profiles_device_platform ON public.profiles(device_platform);