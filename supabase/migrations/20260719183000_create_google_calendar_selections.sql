begin;

create table public.google_calendar_selections (
  member_id uuid not null references public.google_connections (member_id) on delete cascade,
  calendar_id text not null,
  created_at timestamptz not null default now(),
  primary key (member_id, calendar_id),
  constraint google_calendar_selections_calendar_id_check
    check (char_length(btrim(calendar_id)) between 1 and 1024)
);

alter table public.google_calendar_selections enable row level security;

create policy google_calendar_selections_select_own
on public.google_calendar_selections
for select
to authenticated
using (member_id = auth.uid());

create function public.save_google_calendar_selections(
  p_member_id uuid,
  p_calendar_ids text[]
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

  delete from public.google_calendar_selections
  where member_id = auth.uid();

  insert into public.google_calendar_selections (member_id, calendar_id)
  select auth.uid(), btrim(calendar_id)
  from unnest(coalesce(p_calendar_ids, '{}'::text[])) as calendar_id
  group by btrim(calendar_id);
end;
$$;

revoke all on table public.google_calendar_selections from anon, authenticated;
grant select on table public.google_calendar_selections to authenticated;
revoke all on function public.save_google_calendar_selections(uuid, text[]) from public;
grant execute on function public.save_google_calendar_selections(uuid, text[]) to authenticated;

commit;
