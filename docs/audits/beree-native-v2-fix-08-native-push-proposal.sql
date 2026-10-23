-- BÉRÉE NATIVE V2 — FIX-08 : CANAL PUSH NATIF ADDITIF
-- PROPOSITION POUR REVUE UNIQUEMENT — NE PAS EXÉCUTER EN PRODUCTION.
-- État distant vérifié en lecture seule le 2026-10-23.
-- Ce fichier est volontairement hors de supabase/migrations.
-- Les tables Web Push existantes ne sont ni modifiées ni renommées.

begin;

create table public.native_push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  expo_push_token text not null unique,
  platform text not null check (platform in ('ios', 'android')),
  project_id uuid not null,
  app_version text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  disabled_at timestamptz,
  constraint native_push_tokens_format_check check (
    expo_push_token ~ '^Expo(nent)?PushToken[[][A-Za-z0-9_-]+[]]$'
  )
);

create index native_push_tokens_active_user_idx
  on public.native_push_tokens (user_id)
  where disabled_at is null;

alter table public.native_push_tokens enable row level security;
revoke all on table public.native_push_tokens from public, anon, authenticated;
grant select, insert, update, delete on table public.native_push_tokens to service_role;

-- Historique Native séparé pour ne pas entrer en conflit avec la contrainte
-- Web (user_id, kind, ref_id) de notifications_sent.
create table public.native_notifications_sent (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  token_id uuid references public.native_push_tokens(id) on delete set null,
  kind text not null,
  ref_id text not null,
  expo_ticket_id text,
  status text not null check (status in ('accepted', 'delivered', 'failed')),
  error_code text,
  created_at timestamptz not null default now(),
  receipt_checked_at timestamptz,
  unique (user_id, token_id, kind, ref_id)
);

create index native_notifications_receipts_idx
  on public.native_notifications_sent (created_at)
  where status = 'accepted' and receipt_checked_at is null;

alter table public.native_notifications_sent enable row level security;
revoke all on table public.native_notifications_sent from public, anon, authenticated;
grant select, insert, update, delete on table public.native_notifications_sent to service_role;

-- Déploiement associé, uniquement après validation :
-- 1. définir extra.eas.projectId dans la configuration EAS de l'application ;
-- 2. créer le secret EXPO_ACCESS_TOKEN et activer Push Security côté Expo ;
-- 3. déployer register-native-push-token, unregister-native-push-token et
--    send-native-test-push avec verify_jwt = true ;
-- 4. tester tickets puis receipts sur un appareil iOS et un appareil Android ;
-- 5. ajouter ensuite le dispatcher planifié Native, sans modifier les
--    fonctions Web Push existantes ;
-- 6. inclure native_push_tokens dans l'export RGPD après son déploiement.

-- La transaction est systématiquement annulée dans ce document de revue.
rollback;
