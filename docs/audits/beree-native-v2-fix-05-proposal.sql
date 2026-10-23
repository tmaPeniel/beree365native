-- BÉRÉE NATIVE V2 — FIX-05 : PROGRESSION TRANSACTIONNELLE
-- PROPOSITION POUR REVUE UNIQUEMENT — NE PAS EXÉCUTER EN PRODUCTION.
-- État distant vérifié en lecture seule le 2026-10-23.
-- Ce fichier est volontairement hors de supabase/migrations.
-- Précondition : appliquer la version sérialisée de change_user_plan() décrite
-- dans beree-native-v2-fix-01-03-proposal.sql au cours de la même livraison.

begin;

-- État constaté : aucune valeur NULL ou incohérente, mais une paire
-- (user_id, chapter_id) dupliquée. Fusionner les doublons en conservant l'état
-- completed s'il existe et son horodatage le plus récent.

with duplicate_groups as (
  select
    user_id,
    chapter_id,
    (array_agg(
      id
      order by
        (status = 'completed') desc,
        completed_at desc nulls last,
        id
    ))[1] as kept_id,
    bool_or(status = 'completed') as has_completed,
    max(completed_at) filter (where status = 'completed') as last_completed_at
  from public.user_progress
  group by user_id, chapter_id
  having count(*) > 1
)
update public.user_progress progress
set
  status = case
    when duplicates.has_completed then 'completed'::public.chapter_status
    else 'pending'::public.chapter_status
  end,
  completed_at = case
    when duplicates.has_completed then duplicates.last_completed_at
    else null
  end
from duplicate_groups duplicates
where progress.id = duplicates.kept_id;

with ranked_progress as (
  select
    id,
    row_number() over (
      partition by user_id, chapter_id
      order by
        (status = 'completed') desc,
        completed_at desc nulls last,
        id
    ) as duplicate_rank
  from public.user_progress
)
delete from public.user_progress progress
using ranked_progress ranked
where progress.id = ranked.id
  and ranked.duplicate_rank > 1;

-- Garanties structurelles nécessaires à un UPSERT atomique.

alter table public.user_progress
  alter column user_id set not null,
  alter column chapter_id set not null,
  alter column status set not null;

alter table public.user_progress
  add constraint user_progress_user_chapter_key
  unique (user_id, chapter_id);

alter table public.user_progress
  add constraint user_progress_status_timestamp_check
  check (
    (status = 'completed' and completed_at is not null)
    or (status = 'pending' and completed_at is null)
  );

-- Point d'entrée idempotent : le client envoie l'état voulu et non une commande
-- "toggle" susceptible d'être rejouée deux fois lors d'une reprise réseau.

create function public.set_my_chapter_progress(
  p_chapter_id uuid,
  p_status public.chapter_status
)
returns public.user_progress
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  current_user_id uuid := auth.uid();
  current_plan_id uuid;
  saved_progress public.user_progress;
begin
  if current_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  if p_chapter_id is null or p_status is null then
    raise exception 'Chapter and status are required' using errcode = '22004';
  end if;

  -- Le même verrou est pris par change_user_plan() afin d'empêcher une écriture
  -- tardive dans l'ancien plan pendant sa réinitialisation.
  select profile.selected_plan_id
  into current_plan_id
  from public.profiles profile
  where profile.id = current_user_id
  for update;

  if current_plan_id is null then
    raise exception 'Active reading plan not found' using errcode = 'P0002';
  end if;

  if not exists (
    select 1
    from public.reading_plan_chapters chapter
    where chapter.id = p_chapter_id
      and chapter.plan_id = current_plan_id
  ) then
    raise exception 'Chapter does not belong to the selected plan'
      using errcode = '42501';
  end if;

  insert into public.user_progress (
    user_id,
    chapter_id,
    status,
    completed_at
  )
  values (
    current_user_id,
    p_chapter_id,
    p_status,
    case when p_status = 'completed' then now() else null end
  )
  on conflict on constraint user_progress_user_chapter_key
  do update set
    status = excluded.status,
    completed_at = case
      when excluded.status = 'completed'
        then coalesce(public.user_progress.completed_at, now())
      else null
    end
  returning * into saved_progress;

  perform public.update_user_activity(current_user_id);
  perform public.calculate_user_badges(current_user_id);

  return saved_progress;
end;
$$;

revoke all on function public.set_my_chapter_progress(uuid, public.chapter_status)
  from public, anon;
grant execute on function public.set_my_chapter_progress(uuid, public.chapter_status)
  to authenticated;

-- Phase de transition Web/Native : conserver temporairement les politiques
-- INSERT/UPDATE/DELETE existantes. Après migration et validation des deux
-- clients, retirer les écritures directes et garder la lecture RLS propriétaire.

-- La transaction est systématiquement annulée dans ce document de revue.
-- Lors de l'autorisation, ce bloc devra devenir une migration dédiée terminée
-- par COMMIT, après test du doublon constaté sur un environnement non productif.
rollback;
