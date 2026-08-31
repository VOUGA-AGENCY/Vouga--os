begin;

create table public.google_calendar_event_projections (
  owner_member_id uuid not null references public.members(id),
  calendar_id text not null,
  google_event_id text not null,
  title text not null,
  description text,
  location text,
  starts_at text not null,
  ends_at text not null,
  sort_at timestamptz not null,
  all_day boolean not null,
  status text not null check (status in ('confirmed','tentative')),
  transparency text,
  event_type text,
  html_link text not null,
  synced_at timestamptz not null default now(),
  primary key (owner_member_id, calendar_id, google_event_id)
);

create index google_calendar_event_projections_range_idx
  on public.google_calendar_event_projections(sort_at, owner_member_id);

alter table public.google_calendar_event_projections enable row level security;
create policy google_calendar_event_projections_shared_select
  on public.google_calendar_event_projections for select to authenticated
  using (public.is_active_member(auth.uid()));

revoke all on table public.google_calendar_event_projections from anon;
grant select on table public.google_calendar_event_projections to authenticated;

create or replace function public.replace_google_calendar_event_projections(
  p_owner_member_id uuid,
  p_range_start timestamptz,
  p_range_end timestamptz,
  p_events jsonb
) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if not public.is_admin(auth.uid()) or p_owner_member_id <> auth.uid() then
    raise exception 'Admin role required' using errcode = '42501';
  end if;
  delete from public.google_calendar_event_projections
  where owner_member_id = p_owner_member_id and sort_at >= p_range_start and sort_at < p_range_end;
  insert into public.google_calendar_event_projections (
    owner_member_id, calendar_id, google_event_id, title, description, location,
    starts_at, ends_at, sort_at, all_day, status, transparency, event_type, html_link, synced_at
  )
  select p_owner_member_id, value->>'calendar_id', value->>'google_event_id', value->>'title',
    nullif(value->>'description',''), nullif(value->>'location',''), value->>'starts_at',
    value->>'ends_at', (value->>'sort_at')::timestamptz, (value->>'all_day')::boolean,
    value->>'status', nullif(value->>'transparency',''), nullif(value->>'event_type',''),
    value->>'html_link', now()
  from jsonb_array_elements(p_events) as value;
end;
$$;

revoke all on function public.replace_google_calendar_event_projections(uuid,timestamptz,timestamptz,jsonb) from public, anon;
grant execute on function public.replace_google_calendar_event_projections(uuid,timestamptz,timestamptz,jsonb) to authenticated;

drop policy if exists google_event_artifacts_select_own on public.google_event_artifacts;
create policy google_event_artifacts_shared_select on public.google_event_artifacts
  for select to authenticated using (public.is_active_member(auth.uid()));
drop policy if exists google_event_artifact_companies_select_own on public.google_event_artifact_companies;
create policy google_event_artifact_companies_shared_select on public.google_event_artifact_companies
  for select to authenticated using (public.is_active_member(auth.uid()));
drop policy if exists google_event_artifact_contacts_select_own on public.google_event_artifact_contacts;
create policy google_event_artifact_contacts_shared_select on public.google_event_artifact_contacts
  for select to authenticated using (public.is_active_member(auth.uid()));
drop policy if exists google_event_artifact_participants_select_own on public.google_event_artifact_participants;
create policy google_event_artifact_participants_shared_select on public.google_event_artifact_participants
  for select to authenticated using (public.is_active_member(auth.uid()));
drop policy if exists google_event_artifact_tasks_select_own on public.google_event_artifact_tasks;
create policy google_event_artifact_tasks_shared_select on public.google_event_artifact_tasks
  for select to authenticated using (public.is_active_member(auth.uid()));

commit;
