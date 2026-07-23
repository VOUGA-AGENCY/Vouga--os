begin;

alter table public.google_calendar_selections
  add column publishes_os_events boolean not null default false;

create unique index google_calendar_selections_one_publish_target
on public.google_calendar_selections (member_id)
where publishes_os_events;

drop function public.save_google_calendar_selections(uuid, text[]);

create function public.save_google_calendar_settings(
  p_member_id uuid,
  p_calendar_ids text[],
  p_publish_calendar_id text
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null or p_member_id <> auth.uid() then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.google_connections
    where member_id = auth.uid()
      and status = 'active'
  ) then
    raise exception 'Active Google connection required' using errcode = '23514';
  end if;

  if exists (
    select 1
    from unnest(coalesce(p_calendar_ids, '{}'::text[])) as calendar_id
    where char_length(btrim(calendar_id)) not between 1 and 1024
  ) then
    raise exception 'Invalid Google calendar ID' using errcode = '23514';
  end if;

  if p_publish_calendar_id is not null and not exists (
    select 1
    from unnest(coalesce(p_calendar_ids, '{}'::text[])) as calendar_id
    where btrim(calendar_id) = btrim(p_publish_calendar_id)
  ) then
    raise exception 'Publish calendar must be visible' using errcode = '23514';
  end if;

  delete from public.google_calendar_selections
  where member_id = auth.uid();

  insert into public.google_calendar_selections (
    member_id,
    calendar_id,
    publishes_os_events
  )
  select
    auth.uid(),
    btrim(calendar_id),
    p_publish_calendar_id is not null
      and btrim(calendar_id) = btrim(p_publish_calendar_id)
  from unnest(coalesce(p_calendar_ids, '{}'::text[])) as calendar_id
  group by btrim(calendar_id);
end;
$$;

create table public.google_meeting_mirrors (
  member_id uuid not null references public.google_connections (member_id) on delete cascade,
  meeting_id uuid not null references public.meetings (id) on delete cascade,
  calendar_id text not null,
  google_event_id text not null,
  sync_status text not null,
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (member_id, meeting_id),
  unique (member_id, calendar_id, google_event_id),
  constraint google_meeting_mirrors_calendar_id_check
    check (char_length(btrim(calendar_id)) between 1 and 1024),
  constraint google_meeting_mirrors_event_id_check
    check (char_length(btrim(google_event_id)) between 5 and 1024),
  constraint google_meeting_mirrors_sync_status_check
    check (sync_status in ('pending', 'synced', 'error', 'deleted'))
);

alter table public.google_meeting_mirrors enable row level security;

create policy google_meeting_mirrors_select_own
on public.google_meeting_mirrors
for select
to authenticated
using (member_id = auth.uid());

create function public.save_google_meeting_mirror(
  p_member_id uuid,
  p_meeting_id uuid,
  p_calendar_id text,
  p_google_event_id text,
  p_sync_status text,
  p_last_synced_at timestamptz
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null or p_member_id <> auth.uid() then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.google_calendar_selections
    where member_id = auth.uid()
      and calendar_id = p_calendar_id
      and publishes_os_events
  ) and not exists (
    select 1
    from public.google_meeting_mirrors
    where member_id = auth.uid()
      and meeting_id = p_meeting_id
      and calendar_id = p_calendar_id
  ) then
    raise exception 'Active publish calendar required' using errcode = '23514';
  end if;

  if p_sync_status not in ('pending', 'synced', 'error', 'deleted') then
    raise exception 'Invalid mirror status' using errcode = '23514';
  end if;

  insert into public.google_meeting_mirrors (
    member_id,
    meeting_id,
    calendar_id,
    google_event_id,
    sync_status,
    last_synced_at
  ) values (
    auth.uid(),
    p_meeting_id,
    btrim(p_calendar_id),
    btrim(p_google_event_id),
    p_sync_status,
    p_last_synced_at
  )
  on conflict (member_id, meeting_id) do update set
    calendar_id = excluded.calendar_id,
    google_event_id = excluded.google_event_id,
    sync_status = excluded.sync_status,
    last_synced_at = excluded.last_synced_at,
    updated_at = now();
end;
$$;

revoke all on table public.google_calendar_selections from anon, authenticated;
grant select on table public.google_calendar_selections to authenticated;
revoke all on table public.google_meeting_mirrors from anon, authenticated;
grant select on table public.google_meeting_mirrors to authenticated;
revoke all on function public.save_google_calendar_settings(uuid, text[], text) from public;
grant execute on function public.save_google_calendar_settings(uuid, text[], text) to authenticated;
revoke all on function public.save_google_meeting_mirror(uuid, uuid, text, text, text, timestamptz) from public;
grant execute on function public.save_google_meeting_mirror(uuid, uuid, text, text, text, timestamptz) to authenticated;

commit;
