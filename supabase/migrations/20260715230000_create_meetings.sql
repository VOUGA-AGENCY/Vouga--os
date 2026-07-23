begin;

create table public.meetings (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  purpose text not null,
  intended_result text,
  status text not null default 'planned',
  closer_member_id uuid not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  agenda text,
  notes text,
  open_questions text,
  conclusion text,
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint meetings_closer_member_id_fkey
    foreign key (closer_member_id) references public.members (id) on delete restrict,
  constraint meetings_title_length_check
    check (char_length(btrim(title)) between 1 and 160),
  constraint meetings_purpose_length_check
    check (char_length(btrim(purpose)) between 1 and 2000),
  constraint meetings_intended_result_length_check
    check (intended_result is null or char_length(btrim(intended_result)) between 1 and 4000),
  constraint meetings_status_check
    check (status in ('planned', 'needs_closure', 'closed', 'cancelled')),
  constraint meetings_interval_check
    check (ends_at > starts_at),
  constraint meetings_agenda_length_check
    check (agenda is null or char_length(btrim(agenda)) between 1 and 4000),
  constraint meetings_notes_length_check
    check (notes is null or char_length(btrim(notes)) between 1 and 12000),
  constraint meetings_open_questions_length_check
    check (open_questions is null or char_length(btrim(open_questions)) between 1 and 4000),
  constraint meetings_conclusion_length_check
    check (conclusion is null or char_length(btrim(conclusion)) between 1 and 4000),
  constraint meetings_closure_check
    check (
      (status = 'closed' and closed_at is not null and conclusion is not null)
      or (status <> 'closed' and closed_at is null)
    )
);

create index meetings_starts_at_idx on public.meetings (starts_at);
create index meetings_status_ends_at_idx on public.meetings (status, ends_at);
create index meetings_closer_member_id_idx on public.meetings (closer_member_id);

create table public.meeting_participants (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null,
  member_id uuid,
  external_name text,
  constraint meeting_participants_meeting_id_fkey
    foreign key (meeting_id) references public.meetings (id) on delete cascade,
  constraint meeting_participants_member_id_fkey
    foreign key (member_id) references public.members (id) on delete restrict,
  constraint meeting_participants_identity_check
    check ((member_id is not null) <> (external_name is not null)),
  constraint meeting_participants_external_name_length_check
    check (external_name is null or char_length(btrim(external_name)) between 1 and 160)
);

create unique index meeting_participants_member_unique
  on public.meeting_participants (meeting_id, member_id)
  where member_id is not null;
create unique index meeting_participants_external_name_unique
  on public.meeting_participants (meeting_id, lower(external_name))
  where external_name is not null;
create index meeting_participants_meeting_id_idx
  on public.meeting_participants (meeting_id);

create table public.meeting_companies (
  meeting_id uuid not null,
  company_id uuid not null,
  primary key (meeting_id, company_id),
  constraint meeting_companies_meeting_id_fkey
    foreign key (meeting_id) references public.meetings (id) on delete cascade,
  constraint meeting_companies_company_id_fkey
    foreign key (company_id) references public.companies (id) on delete restrict
);

create index meeting_companies_company_id_idx on public.meeting_companies (company_id);

create trigger meetings_set_updated_at
before update on public.meetings
for each row execute function public.set_updated_at();

create function public.require_active_meeting_member()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  checked_member_id uuid;
begin
  checked_member_id := case
    when tg_table_name = 'meetings' then new.closer_member_id
    else new.member_id
  end;

  if checked_member_id is not null and not exists (
    select 1 from public.members where id = checked_member_id and is_active = true
  ) then
    raise exception 'Meeting member must be active' using errcode = '23514';
  end if;

  return new;
end;
$$;

create trigger meetings_require_active_closer
before insert or update of closer_member_id on public.meetings
for each row execute function public.require_active_meeting_member();

create trigger meeting_participants_require_active_member
before insert or update of member_id on public.meeting_participants
for each row execute function public.require_active_meeting_member();

alter table public.meetings enable row level security;
alter table public.meeting_participants enable row level security;
alter table public.meeting_companies enable row level security;

create policy meetings_select_authenticated on public.meetings
for select to authenticated using (auth.uid() is not null);
create policy meetings_insert_authenticated on public.meetings
for insert to authenticated with check (auth.uid() is not null);
create policy meetings_update_authenticated on public.meetings
for update to authenticated using (auth.uid() is not null) with check (auth.uid() is not null);

create policy meeting_participants_select_authenticated on public.meeting_participants
for select to authenticated using (auth.uid() is not null);
create policy meeting_participants_insert_authenticated on public.meeting_participants
for insert to authenticated with check (auth.uid() is not null);
create policy meeting_participants_update_authenticated on public.meeting_participants
for update to authenticated using (auth.uid() is not null) with check (auth.uid() is not null);
create policy meeting_participants_delete_authenticated on public.meeting_participants
for delete to authenticated using (auth.uid() is not null);

create policy meeting_companies_select_authenticated on public.meeting_companies
for select to authenticated using (auth.uid() is not null);
create policy meeting_companies_insert_authenticated on public.meeting_companies
for insert to authenticated with check (auth.uid() is not null);
create policy meeting_companies_delete_authenticated on public.meeting_companies
for delete to authenticated using (auth.uid() is not null);

create function public.save_meeting(
  p_meeting_id uuid,
  p_values jsonb,
  p_participants jsonb,
  p_company_ids uuid[]
)
returns uuid
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  saved_meeting_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  if p_meeting_id is null then
    insert into public.meetings (
      title, purpose, intended_result, closer_member_id, starts_at, ends_at,
      agenda, notes, open_questions
    ) values (
      btrim(p_values ->> 'title'),
      btrim(p_values ->> 'purpose'),
      nullif(btrim(p_values ->> 'intended_result'), ''),
      (p_values ->> 'closer_member_id')::uuid,
      (p_values ->> 'starts_at')::timestamptz,
      (p_values ->> 'ends_at')::timestamptz,
      nullif(btrim(p_values ->> 'agenda'), ''),
      nullif(btrim(p_values ->> 'notes'), ''),
      nullif(btrim(p_values ->> 'open_questions'), '')
    ) returning id into saved_meeting_id;
  else
    update public.meetings set
      title = btrim(p_values ->> 'title'),
      purpose = btrim(p_values ->> 'purpose'),
      intended_result = nullif(btrim(p_values ->> 'intended_result'), ''),
      closer_member_id = (p_values ->> 'closer_member_id')::uuid,
      starts_at = (p_values ->> 'starts_at')::timestamptz,
      ends_at = (p_values ->> 'ends_at')::timestamptz,
      agenda = nullif(btrim(p_values ->> 'agenda'), ''),
      notes = nullif(btrim(p_values ->> 'notes'), ''),
      open_questions = nullif(btrim(p_values ->> 'open_questions'), '')
    where id = p_meeting_id and status in ('planned', 'needs_closure')
    returning id into saved_meeting_id;

    if saved_meeting_id is null then
      raise exception 'Meeting not found or no longer editable' using errcode = 'P0002';
    end if;

    delete from public.meeting_participants where meeting_id = saved_meeting_id;
    delete from public.meeting_companies where meeting_id = saved_meeting_id;
  end if;

  insert into public.meeting_participants (meeting_id, member_id, external_name)
  select
    saved_meeting_id,
    nullif(participant ->> 'member_id', '')::uuid,
    nullif(btrim(participant ->> 'external_name'), '')
  from jsonb_array_elements(coalesce(p_participants, '[]'::jsonb)) as participant;

  insert into public.meeting_companies (meeting_id, company_id)
  select saved_meeting_id, company_id
  from unnest(coalesce(p_company_ids, '{}'::uuid[])) as company_id;

  return saved_meeting_id;
end;
$$;

revoke all on table public.meetings from anon;
revoke all on table public.meeting_participants from anon;
revoke all on table public.meeting_companies from anon;
grant select, insert, update on table public.meetings to authenticated;
grant select, insert, update, delete on table public.meeting_participants to authenticated;
grant select, insert, delete on table public.meeting_companies to authenticated;
revoke all on function public.save_meeting(uuid, jsonb, jsonb, uuid[]) from public, anon;
grant execute on function public.save_meeting(uuid, jsonb, jsonb, uuid[]) to authenticated;

commit;
