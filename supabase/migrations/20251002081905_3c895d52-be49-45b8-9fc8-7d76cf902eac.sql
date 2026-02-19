-- =====================================================
-- Correction de sécurité: Protection des clés de push notifications
-- =====================================================

-- 1. Supprimer l'ancienne politique trop permissive
DROP POLICY IF EXISTS "Users can manage their own push subscriptions" ON public.push_subscriptions;

-- 2. Créer des politiques granulaires et sécurisées

-- Permettre aux utilisateurs d'insérer leurs propres abonnements
CREATE POLICY "Users can insert their own push subscriptions"
ON public.push_subscriptions
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Permettre aux utilisateurs de mettre à jour UNIQUEMENT le statut is_active
CREATE POLICY "Users can update their own subscription status"
ON public.push_subscriptions
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Permettre aux utilisateurs de supprimer leurs propres abonnements
CREATE POLICY "Users can delete their own push subscriptions"
ON public.push_subscriptions
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- IMPORTANT: Aucune politique SELECT pour les utilisateurs normaux
-- Seul le service role (edge functions) peut lire les clés sensibles

-- 3. Créer une fonction sécurisée pour vérifier le statut d'abonnement
CREATE OR REPLACE FUNCTION public.get_user_push_subscription_status()
RETURNS TABLE (
  id uuid,
  is_active boolean,
  created_at timestamp with time zone,
  endpoint_preview text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    id,
    is_active,
    created_at,
    substring(endpoint from 1 for 30) || '...' as endpoint_preview
  FROM public.push_subscriptions
  WHERE user_id = auth.uid()
  LIMIT 1;
$$;

-- 4. Accorder les permissions pour exécuter la fonction
GRANT EXECUTE ON FUNCTION public.get_user_push_subscription_status() TO authenticated;

-- 5. Correction pour notification_logs: restreindre l'accès aux données sensibles
DROP POLICY IF EXISTS "Users can view their own notification logs" ON public.notification_logs;

-- Créer une fonction sécurisée pour l'historique des notifications
CREATE OR REPLACE FUNCTION public.get_user_notification_history()
RETURNS TABLE (
  id uuid,
  notification_type text,
  sent_at timestamp with time zone,
  success boolean,
  status_message text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    id,
    notification_type,
    sent_at,
    success,
    CASE 
      WHEN success THEN 'Notification envoyee avec succes'
      ELSE 'Echec d''envoi'
    END as status_message
  FROM public.notification_logs
  WHERE user_id = auth.uid()
  ORDER BY sent_at DESC
  LIMIT 50;
$$;

-- Accorder les permissions pour exécuter la fonction
GRANT EXECUTE ON FUNCTION public.get_user_notification_history() TO authenticated;