begin;

create table public.decisions (
  id uuid primary key,
  title text not null,
  choice text not null,
  reason text not null,
  alternatives text,
  impact text not null,
  status text not null default 'current',
  authority_member_id uuid not null references public.members (id) on delete restrict,
  decided_on date not null,
  origin_meeting_id uuid references public.meetings (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint decisions_title_length_check check (char_length(btrim(title)) between 1 and 160),
  constraint decisions_choice_length_check check (char_length(btrim(choice)) between 1 and 4000),
  constraint decisions_reason_length_check check (char_length(btrim(reason)) between 1 and 4000),
  constraint decisions_alternatives_length_check check (
    alternatives is null or char_length(btrim(alternatives)) between 1 and 4000
  ),
  constraint decisions_impact_length_check check (char_length(btrim(impact)) between 1 and 4000),
  constraint decisions_status_check check (status in ('current', 'superseded', 'revoked'))
);

create index decisions_status_decided_on_idx on public.decisions (status, decided_on desc);
create index decisions_authority_member_id_idx on public.decisions (authority_member_id);
create index decisions_origin_meeting_id_idx on public.decisions (origin_meeting_id)
  where origin_meeting_id is not null;

create table public.decision_revisions (
  decision_id uuid primary key references public.decisions (id) on delete restrict,
  previous_decision_id uuid not null references public.decisions (id) on delete restrict,
  effect text not null,
  constraint decision_revisions_distinct_check check (decision_id <> previous_decision_id),
  constraint decision_revisions_effect_check check (effect in ('supersedes', 'limits', 'revokes'))
);

create index decision_revisions_previous_decision_id_idx
  on public.decision_revisions (previous_decision_id);

create table public.decision_companies (
  decision_id uuid not null references public.decisions (id) on delete cascade,
  company_id uuid not null references public.companies (id) on delete restrict,
  primary key (decision_id, company_id)
);
create index decision_companies_company_id_idx on public.decision_companies (company_id);

create table public.decision_meetings (
  decision_id uuid not null references public.decisions (id) on delete cascade,
  meeting_id uuid not null references public.meetings (id) on delete restrict,
  primary key (decision_id, meeting_id)
);
create index decision_meetings_meeting_id_idx on public.decision_meetings (meeting_id);

create table public.decision_tasks (
  decision_id uuid not null references public.decisions (id) on delete cascade,
  task_id uuid not null references public.tasks (id) on delete restrict,
  primary key (decision_id, task_id)
);
create index decision_tasks_task_id_idx on public.decision_tasks (task_id);

alter table public.tasks
  add column origin_decision_id uuid references public.decisions (id) on delete restrict;

alter table public.tasks drop constraint tasks_origin_check;
alter table public.tasks add constraint tasks_origin_check check (
  (origin_type = 'meeting'
    and origin_meeting_id is not null
    and origin_decision_id is null
    and direct_origin_reason is null)
  or (origin_type = 'decision'
    and origin_meeting_id is null
    and origin_decision_id is not null
    and direct_origin_reason is null)
  or (origin_type = 'direct'
    and origin_meeting_id is null
    and origin_decision_id is null
    and char_length(btrim(direct_origin_reason)) between 1 and 1000)
);
create index tasks_origin_decision_id_idx on public.tasks (origin_decision_id)
  where origin_decision_id is not null;

create trigger decisions_set_updated_at
before update on public.decisions
for each row execute function public.set_updated_at();

create function public.require_active_decision_authority()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not exists (
    select 1 from public.members
    where id = new.authority_member_id and is_active = true
  ) then
    raise exception 'Decision authority must be an active member' using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger decisions_require_active_authority
before insert or update of authority_member_id on public.decisions
for each row execute function public.require_active_decision_authority();

alter table public.decisions enable row level security;
alter table public.decision_revisions enable row level security;
alter table public.decision_companies enable row level security;
alter table public.decision_meetings enable row level security;
alter table public.decision_tasks enable row level security;

create policy decisions_select_authenticated on public.decisions
for select to authenticated using (auth.uid() is not null);
create policy decision_revisions_select_authenticated on public.decision_revisions
for select to authenticated using (auth.uid() is not null);
create policy decision_companies_select_authenticated on public.decision_companies
for select to authenticated using (auth.uid() is not null);
create policy decision_meetings_select_authenticated on public.decision_meetings
for select to authenticated using (auth.uid() is not null);
create policy decision_tasks_select_authenticated on public.decision_tasks
for select to authenticated using (auth.uid() is not null);
create policy decision_tasks_insert_authenticated on public.decision_tasks
for insert to authenticated with check (auth.uid() is not null);

create function public.create_decision(
  p_decision_id uuid,
  p_values jsonb,
  p_company_ids uuid[],
  p_meeting_ids uuid[],
  p_task_ids uuid[],
  p_previous_decision_id uuid,
  p_review_effect text
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  previous_status text;
  origin_meeting_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  if (p_previous_decision_id is null) <> (p_review_effect is null) then
    raise exception 'Previous Decision and review effect must be provided together'
      using errcode = '23514';
  end if;

  if p_previous_decision_id is not null then
    if p_previous_decision_id = p_decision_id then
      raise exception 'A Decision cannot review itself' using errcode = '23514';
    end if;
    if p_review_effect not in ('supersedes', 'limits', 'revokes') then
      raise exception 'Invalid Decision review effect' using errcode = '23514';
    end if;

    select status into previous_status
    from public.decisions
    where id = p_previous_decision_id
    for update;

    if previous_status is null then
      raise exception 'Previous Decision not found' using errcode = 'P0002';
    end if;
    if previous_status <> 'current' then
      raise exception 'Only a current Decision can be reviewed' using errcode = '23514';
    end if;
  end if;

  origin_meeting_id := nullif(p_values ->> 'origin_meeting_id', '')::uuid;

  insert into public.decisions (
    id, title, choice, reason, alternatives, impact,
    authority_member_id, decided_on, origin_meeting_id
  ) values (
    p_decision_id,
    btrim(p_values ->> 'title'),
    btrim(p_values ->> 'choice'),
    btrim(p_values ->> 'reason'),
    nullif(btrim(p_values ->> 'alternatives'), ''),
    btrim(p_values ->> 'impact'),
    (p_values ->> 'authority_member_id')::uuid,
    (p_values ->> 'decided_on')::date,
    origin_meeting_id
  );

  insert into public.decision_companies (decision_id, company_id)
  select p_decision_id, company_id
  from (select distinct unnest(coalesce(p_company_ids, '{}'::uuid[])) as company_id) as companies;

  insert into public.decision_meetings (decision_id, meeting_id)
  select p_decision_id, meeting_id
  from (select distinct unnest(coalesce(p_meeting_ids, '{}'::uuid[])) as meeting_id) as meetings;

  if origin_meeting_id is not null then
    insert into public.decision_meetings (decision_id, meeting_id)
    values (p_decision_id, origin_meeting_id)
    on conflict do nothing;
  end if;

  insert into public.decision_tasks (decision_id, task_id)
  select p_decision_id, task_id
  from (select distinct unnest(coalesce(p_task_ids, '{}'::uuid[])) as task_id) as tasks;

  if p_previous_decision_id is not null then
    insert into public.decision_revisions (decision_id, previous_decision_id, effect)
    values (p_decision_id, p_previous_decision_id, p_review_effect);

    if p_review_effect = 'supersedes' then
      update public.decisions set status = 'superseded' where id = p_previous_decision_id;
    elsif p_review_effect = 'revokes' then
      update public.decisions set status = 'revoked' where id = p_previous_decision_id;
    end if;
  end if;

  return p_decision_id;
end;
$$;

create or replace function public.save_task(
  p_task_id uuid,
  p_values jsonb,
  p_company_ids uuid[],
  p_meeting_ids uuid[]
)
returns uuid
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare saved_task_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if p_task_id is null then
    insert into public.tasks (
      title, expected_result, owner_member_id, due_at, origin_type,
      origin_meeting_id, origin_decision_id, direct_origin_reason
    ) values (
      btrim(p_values->>'title'),
      btrim(p_values->>'expected_result'),
      (p_values->>'owner_member_id')::uuid,
      nullif(p_values->>'due_at','')::timestamptz,
      p_values->>'origin_type',
      nullif(p_values->>'origin_meeting_id','')::uuid,
      nullif(p_values->>'origin_decision_id','')::uuid,
      nullif(btrim(p_values->>'direct_origin_reason'),'')
    ) returning id into saved_task_id;
  else
    update public.tasks set
      title = btrim(p_values->>'title'),
      expected_result = btrim(p_values->>'expected_result'),
      owner_member_id = (p_values->>'owner_member_id')::uuid,
      due_at = nullif(p_values->>'due_at','')::timestamptz
    where id = p_task_id and status not in ('completed','cancelled')
    returning id into saved_task_id;
    if saved_task_id is null then
      raise exception 'Task not found or no longer editable' using errcode='P0002';
    end if;
    delete from public.task_companies where task_id = saved_task_id;
    delete from public.task_meetings where task_id = saved_task_id;
  end if;

  insert into public.task_companies (task_id, company_id)
  select saved_task_id, context_company.company_id
  from unnest(coalesce(p_company_ids,'{}'::uuid[])) as context_company(company_id);

  insert into public.task_meetings (task_id, meeting_id)
  select saved_task_id, context_meeting.meeting_id
  from unnest(coalesce(p_meeting_ids,'{}'::uuid[])) as context_meeting(meeting_id);

  insert into public.task_meetings (task_id, meeting_id)
  select saved_task_id, origin_meeting_id from public.tasks
  where id = saved_task_id and origin_type = 'meeting'
  on conflict do nothing;

  insert into public.decision_tasks (decision_id, task_id)
  select origin_decision_id, saved_task_id from public.tasks
  where id = saved_task_id and origin_type = 'decision'
  on conflict do nothing;

  return saved_task_id;
end;
$$;

revoke all on table public.decisions from anon, authenticated;
revoke all on table public.decision_revisions from anon, authenticated;
revoke all on table public.decision_companies from anon, authenticated;
revoke all on table public.decision_meetings from anon, authenticated;
revoke all on table public.decision_tasks from anon, authenticated;

grant select on table public.decisions to authenticated;
grant select on table public.decision_revisions to authenticated;
grant select on table public.decision_companies to authenticated;
grant select on table public.decision_meetings to authenticated;
grant select, insert on table public.decision_tasks to authenticated;

revoke all on function public.create_decision(
  uuid, jsonb, uuid[], uuid[], uuid[], uuid, text
) from public, anon;
grant execute on function public.create_decision(
  uuid, jsonb, uuid[], uuid[], uuid[], uuid, text
) to authenticated;

commit;
