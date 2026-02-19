-- Ajouter les colonnes pour gérer le statut des notifications
ALTER TABLE public.notification_logs 
  ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS read_at TIMESTAMP WITH TIME ZONE;

-- Index pour optimiser les requêtes sur les notifications non lues
CREATE INDEX IF NOT EXISTS idx_notification_logs_user_unread 
  ON notification_logs(user_id, is_read, is_deleted) 
  WHERE is_deleted = false;

-- Politique RLS pour permettre aux utilisateurs de mettre à jour leurs propres notifications
CREATE POLICY "Users can update their own notifications"
  ON notification_logs FOR UPDATE
  USING (auth.uid() = user_id);

-- Politique RLS pour permettre aux utilisateurs de supprimer leurs propres notifications
CREATE POLICY "Users can delete their own notifications"
  ON notification_logs FOR DELETE
  USING (auth.uid() = user_id);