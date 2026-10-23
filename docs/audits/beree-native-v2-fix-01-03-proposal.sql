-- BÉRÉE NATIVE V2 — FIX-01 À FIX-03
-- PROPOSITION POUR REVUE UNIQUEMENT — NE PAS EXÉCUTER EN PRODUCTION.
-- État distant vérifié en lecture seule le 2026-10-23.
-- Ce fichier est volontairement hors de supabase/migrations.

begin;

-- FIX-01 --------------------------------------------------------------------
-- disable_rls() et enable_rls() ne sont pas présentes sur le projet distant.
-- Réduire néanmoins l'exposition anonyme des RPC sensibles déjà déployées.

revoke execute on function public.change_user_plan(uuid) from public, anon;
revoke execute on function public.update_my_plan_start_date(date) from public, anon;
revoke execute on function public.update_user_activity(uuid) from public, anon;
revoke execute on function public.admin_grant_premium(uuid, integer, text) from public, anon;
revoke execute on function public.admin_revoke_premium(uuid) from public, anon;

grant execute on function public.change_user_plan(uuid) to authenticated, service_role;
grant execute on function public.update_my_plan_start_date(date) to authenticated, service_role;
grant execute on function public.update_user_activity(uuid) to authenticated, service_role;
grant execute on function public.admin_grant_premium(uuid, integer, text) to authenticated, service_role;
grant execute on function public.admin_revoke_premium(uuid) to authenticated, service_role;

-- FIX-03 --------------------------------------------------------------------
-- Conserver les signatures utilisées par la Web App et Native, mais déplacer
-- les implémentations privilégiées derrière des wrappers contrôlant la cible.

alter function public.get_completed_days_count(uuid)
  rename to get_completed_days_count_internal;
alter function public.get_completed_days_count_internal(uuid)
  set search_path = public, pg_temp;
revoke all on function public.get_completed_days_count_internal(uuid)
  from public, anon, authenticated;

create function public.get_completed_days_count(p_user_id uuid)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if coalesce(auth.jwt() ->> 'role', '') <> 'service_role'
     and (
       auth.uid() is null
       or (
         p_user_id is distinct from auth.uid()
         and not public.has_role(auth.uid(), 'admin')
       )
     )
  then
    raise exception 'Users can only read their own completed days'
      using errcode = '42501';
  end if;

  return public.get_completed_days_count_internal(p_user_id);
end;
$$;

revoke all on function public.get_completed_days_count(uuid) from public, anon;
grant execute on function public.get_completed_days_count(uuid)
  to authenticated, service_role;

alter function public.calculate_user_badges(uuid)
  rename to calculate_user_badges_internal;
alter function public.calculate_user_badges_internal(uuid)
  set search_path = public, pg_temp;
revoke all on function public.calculate_user_badges_internal(uuid)
  from public, anon, authenticated;

create function public.calculate_user_badges(_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if coalesce(auth.jwt() ->> 'role', '') <> 'service_role'
     and (
       auth.uid() is null
       or (
         _user_id is distinct from auth.uid()
         and not public.has_role(auth.uid(), 'admin')
       )
     )
  then
    raise exception 'Users can only calculate their own badges'
      using errcode = '42501';
  end if;

  perform public.calculate_user_badges_internal(_user_id);
end;
$$;

revoke all on function public.calculate_user_badges(uuid) from public, anon;
grant execute on function public.calculate_user_badges(uuid)
  to authenticated, service_role;

-- update_user_activity(uuid) contrôle déjà p_user_id = auth.uid().
-- On conserve donc son implémentation et sa signature actuelles.

-- FIX-02 --------------------------------------------------------------------
-- Autoriser selected_plan_id uniquement pendant change_user_plan().
-- Les quatre colonnes Premium sont déjà protégées par le trigger distant.

create or replace function public.prevent_premium_self_edit()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null or public.has_role(auth.uid(), 'admin') then
    return new;
  end if;

  if new.is_premium is distinct from old.is_premium
     or new.premium_start_date is distinct from old.premium_start_date
     or new.premium_end_date is distinct from old.premium_end_date
     or new.premium_source is distinct from old.premium_source
  then
    raise exception 'Premium fields can only be modified by an administrator'
      using errcode = '42501';
  end if;

  if new.selected_plan_id is distinct from old.selected_plan_id
     and coalesce(current_setting('beree.plan_change_authorized', true), '') <> 'true'
  then
    raise exception 'Reading plan must be changed through change_user_plan'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

revoke all on function public.prevent_premium_self_edit()
  from public, anon, authenticated;

create or replace function public.change_user_plan(new_plan_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  canonical_plan_id uuid := public.get_canonical_plan_id();
begin
  if auth.uid() is null then
    raise exception 'User must be authenticated' using errcode = '42501';
  end if;

  -- Sérialise le changement de plan avec les futures écritures de progression.
  perform 1
  from public.profiles
  where id = auth.uid()
  for update;

  if not exists (
    select 1
    from public.reading_plans
    where id = new_plan_id and is_active = true
  ) then
    raise exception 'Plan not found or inactive';
  end if;

  if not public.is_premium_active(auth.uid())
     and new_plan_id is distinct from canonical_plan_id
  then
    raise exception 'Premium subscription required to select this plan';
  end if;

  delete from public.user_progress where user_id = auth.uid();
  delete from public.user_badges where user_id = auth.uid();

  perform set_config('beree.plan_change_authorized', 'true', true);

  update public.profiles
  set selected_plan_id = new_plan_id,
      start_date = current_date,
      current_day_number = 1
  where id = auth.uid();
end;
$$;

revoke all on function public.change_user_plan(uuid) from public, anon;
grant execute on function public.change_user_plan(uuid)
  to authenticated, service_role;

-- À AJOUTER SEULEMENT APRÈS VALIDATION DU PARCOURS D'INSCRIPTION WEB :
-- handle_new_user() doit ignorer raw_user_meta_data.plan_id et choisir le plan
-- canonique côté serveur. Cette partie reste volontairement hors de cette
-- proposition afin de ne pas modifier le comportement de la Web App à l'aveugle.

-- La transaction est systématiquement annulée dans ce document de revue.
-- Lors de l'autorisation, ce bloc devra devenir une migration dédiée terminée
-- par COMMIT, après tests sur un environnement non productif.
rollback;
