begin;

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  expected_result text not null,
  status text not null default 'todo',
  owner_member_id uuid not null references public.members (id) on delete restrict,
  due_at timestamptz,
  blocked_reason text,
  blocked_next_move text,
  completion_note text,
  completed_at timestamptz,
  origin_type text not null,
  origin_meeting_id uuid references public.meetings (id) on delete restrict,
  direct_origin_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tasks_title_length_check check (char_length(btrim(title)) between 1 and 160),
  constraint tasks_expected_result_length_check check (char_length(btrim(expected_result)) between 1 and 2000),
  constraint tasks_status_check check (status in ('todo', 'in_progress', 'blocked', 'completed', 'cancelled')),
  constraint tasks_origin_check check (
    (origin_type = 'meeting' and origin_meeting_id is not null and direct_origin_reason is null)
    or (origin_type = 'direct' and origin_meeting_id is null and char_length(btrim(direct_origin_reason)) between 1 and 1000)
  ),
  constraint tasks_blocked_check check (
    (status = 'blocked' and char_length(btrim(blocked_reason)) between 1 and 2000 and char_length(btrim(blocked_next_move)) between 1 and 2000)
    or (status <> 'blocked' and blocked_reason is null and blocked_next_move is null)
  ),
  constraint tasks_completion_check check (
    (status = 'completed' and completed_at is not null)
    or (status <> 'completed' and completed_at is null and completion_note is null)
  ),
  constraint tasks_completion_note_length_check check (completion_note is null or char_length(btrim(completion_note)) between 1 and 4000)
);
create index tasks_status_updated_at_idx on public.tasks (status, updated_at desc);
create index tasks_owner_member_id_idx on public.tasks (owner_member_id);
create index tasks_origin_meeting_id_idx on public.tasks (origin_meeting_id) where origin_meeting_id is not null;
create index tasks_due_at_idx on public.tasks (due_at) where due_at is not null;

create table public.task_companies (
  task_id uuid not null references public.tasks (id) on delete cascade,
  company_id uuid not null references public.companies (id) on delete restrict,
  primary key (task_id, company_id)
);
create index task_companies_company_id_idx on public.task_companies (company_id);

create table public.task_meetings (
  task_id uuid not null references public.tasks (id) on delete cascade,
  meeting_id uuid not null references public.meetings (id) on delete restrict,
  primary key (task_id, meeting_id)
);
create index task_meetings_meeting_id_idx on public.task_meetings (meeting_id);

create trigger tasks_set_updated_at before update on public.tasks
for each row execute function public.set_updated_at();

create function public.require_active_task_owner() returns trigger language plpgsql security definer
set search_path = public, pg_temp as $$
begin
  if not exists (select 1 from public.members where id = new.owner_member_id and is_active = true) then
    raise exception 'Task owner must be an active member' using errcode = '23514';
  end if;
  return new;
end;
$$;
create trigger tasks_require_active_owner before insert or update of owner_member_id on public.tasks
for each row execute function public.require_active_task_owner();

alter table public.tasks enable row level security;
alter table public.task_companies enable row level security;
alter table public.task_meetings enable row level security;
create policy tasks_select_authenticated on public.tasks for select to authenticated using (auth.uid() is not null);
create policy tasks_insert_authenticated on public.tasks for insert to authenticated with check (auth.uid() is not null);
create policy tasks_update_authenticated on public.tasks for update to authenticated using (auth.uid() is not null) with check (auth.uid() is not null);
create policy task_companies_select_authenticated on public.task_companies for select to authenticated using (auth.uid() is not null);
create policy task_companies_insert_authenticated on public.task_companies for insert to authenticated with check (auth.uid() is not null);
create policy task_companies_delete_authenticated on public.task_companies for delete to authenticated using (auth.uid() is not null);
create policy task_meetings_select_authenticated on public.task_meetings for select to authenticated using (auth.uid() is not null);
create policy task_meetings_insert_authenticated on public.task_meetings for insert to authenticated with check (auth.uid() is not null);
create policy task_meetings_delete_authenticated on public.task_meetings for delete to authenticated using (auth.uid() is not null);

create function public.save_task(p_task_id uuid, p_values jsonb, p_company_ids uuid[], p_meeting_ids uuid[])
returns uuid language plpgsql security invoker set search_path = public, pg_temp as $$
declare saved_task_id uuid;
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if p_task_id is null then
    insert into public.tasks (title, expected_result, owner_member_id, due_at, origin_type, origin_meeting_id, direct_origin_reason)
    values (btrim(p_values->>'title'), btrim(p_values->>'expected_result'), (p_values->>'owner_member_id')::uuid,
      nullif(p_values->>'due_at','')::timestamptz, p_values->>'origin_type', nullif(p_values->>'origin_meeting_id','')::uuid,
      nullif(btrim(p_values->>'direct_origin_reason'),'') ) returning id into saved_task_id;
  else
    update public.tasks set title=btrim(p_values->>'title'), expected_result=btrim(p_values->>'expected_result'),
      owner_member_id=(p_values->>'owner_member_id')::uuid, due_at=nullif(p_values->>'due_at','')::timestamptz
    where id=p_task_id and status not in ('completed','cancelled') returning id into saved_task_id;
    if saved_task_id is null then raise exception 'Task not found or no longer editable' using errcode='P0002'; end if;
    delete from public.task_companies where task_id=saved_task_id;
    delete from public.task_meetings where task_id=saved_task_id;
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
  return saved_task_id;
end;
$$;

revoke all on table public.tasks from anon;
revoke all on table public.task_companies from anon;
revoke all on table public.task_meetings from anon;
grant select, insert, update on public.tasks to authenticated;
grant select, insert, delete on public.task_companies, public.task_meetings to authenticated;
revoke all on function public.save_task(uuid,jsonb,uuid[],uuid[]) from public, anon;
grant execute on function public.save_task(uuid,jsonb,uuid[],uuid[]) to authenticated;
commit;
