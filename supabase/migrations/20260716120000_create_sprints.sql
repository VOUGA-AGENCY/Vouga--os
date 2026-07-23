begin;

create table public.sprints (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  intended_result text not null,
  status text not null default 'planned',
  owner_member_id uuid not null references public.members (id) on delete restrict,
  starts_on date not null,
  ends_on date not null,
  material_risks text,
  actual_result text,
  learning text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint sprints_name_length_check check (char_length(btrim(name)) between 1 and 160),
  constraint sprints_intended_result_length_check check (char_length(btrim(intended_result)) between 1 and 2000),
  constraint sprints_status_check check (status in ('planned', 'active', 'closed', 'cancelled')),
  constraint sprints_interval_check check (starts_on <= ends_on),
  constraint sprints_material_risks_length_check check (material_risks is null or char_length(btrim(material_risks)) between 1 and 4000),
  constraint sprints_closure_check check (
    (status = 'closed' and actual_result is not null and learning is not null
      and char_length(btrim(actual_result)) between 1 and 4000
      and char_length(btrim(learning)) between 1 and 4000)
    or (status <> 'closed' and actual_result is null and learning is null)
  )
);
create unique index sprints_single_active_idx on public.sprints ((status)) where status = 'active';
create index sprints_status_starts_on_idx on public.sprints (status, starts_on desc);
create index sprints_owner_member_id_idx on public.sprints (owner_member_id);

create table public.sprint_tasks (
  sprint_id uuid not null references public.sprints (id) on delete restrict,
  task_id uuid not null references public.tasks (id) on delete restrict,
  committed_at timestamptz not null default now(),
  closure_disposition text,
  primary key (sprint_id, task_id),
  constraint sprint_tasks_closure_disposition_check check (
    closure_disposition is null or closure_disposition in ('completed', 'recommitted', 'split', 'returned_to_future', 'cancelled')
  )
);
create index sprint_tasks_task_id_idx on public.sprint_tasks (task_id);

create trigger sprints_set_updated_at before update on public.sprints
for each row execute function public.set_updated_at();

create function public.require_active_sprint_owner() returns trigger language plpgsql security definer
set search_path = public, pg_temp as $$
begin
  if not exists (select 1 from public.members where id = new.owner_member_id and is_active = true) then
    raise exception 'Sprint owner must be an active member' using errcode = '23514';
  end if;
  return new;
end;
$$;
create trigger sprints_require_active_owner before insert or update of owner_member_id on public.sprints
for each row execute function public.require_active_sprint_owner();

alter table public.sprints enable row level security;
alter table public.sprint_tasks enable row level security;
create policy sprints_select_authenticated on public.sprints for select to authenticated using (auth.uid() is not null);
create policy sprint_tasks_select_authenticated on public.sprint_tasks for select to authenticated using (auth.uid() is not null);

create function public.create_sprint(p_values jsonb, p_task_ids uuid[]) returns uuid
language plpgsql security definer set search_path = public, pg_temp as $$
declare saved_id uuid;
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  insert into public.sprints (name, intended_result, owner_member_id, starts_on, ends_on, material_risks)
  values (btrim(p_values->>'name'), btrim(p_values->>'intended_result'), (p_values->>'owner_member_id')::uuid,
    (p_values->>'starts_on')::date, (p_values->>'ends_on')::date, nullif(btrim(p_values->>'material_risks'), ''))
  returning id into saved_id;
  insert into public.sprint_tasks (sprint_id, task_id)
  select saved_id, task_id from (select distinct unnest(coalesce(p_task_ids, '{}'::uuid[])) task_id) selected;
  return saved_id;
end;
$$;

create function public.activate_sprint(p_sprint_id uuid) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if not exists (select 1 from public.sprint_tasks where sprint_id = p_sprint_id) then
    raise exception 'Sprint requires at least one Task before activation' using errcode = '23514';
  end if;
  update public.sprints set status = 'active' where id = p_sprint_id and status = 'planned';
  if not found then raise exception 'Sprint not found or not planned' using errcode = 'P0002'; end if;
end;
$$;

create function public.add_sprint_tasks(p_sprint_id uuid, p_task_ids uuid[]) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare current_status text;
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  select status into current_status from public.sprints where id = p_sprint_id for update;
  if current_status is null or current_status not in ('planned', 'active') then raise exception 'Sprint no longer accepts commitments' using errcode = '23514'; end if;
  insert into public.sprint_tasks (sprint_id, task_id)
  select p_sprint_id, task_id from (select distinct unnest(coalesce(p_task_ids, '{}'::uuid[])) task_id) selected
  on conflict do nothing;
end;
$$;

create function public.remove_sprint_task(p_sprint_id uuid, p_task_id uuid) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if not exists (select 1 from public.sprints where id = p_sprint_id and status = 'planned' for update) then
    raise exception 'Only planned Sprint commitments can be removed' using errcode = '23514';
  end if;
  delete from public.sprint_tasks where sprint_id = p_sprint_id and task_id = p_task_id;
end;
$$;

create function public.cancel_sprint(p_sprint_id uuid) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  update public.sprints set status = 'cancelled' where id = p_sprint_id and status in ('planned', 'active');
  if not found then raise exception 'Sprint not found or already terminal' using errcode = 'P0002'; end if;
end;
$$;

create function public.close_sprint(p_sprint_id uuid, p_actual_result text, p_learning text, p_dispositions jsonb) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if not exists (select 1 from public.sprints where id = p_sprint_id and status = 'active' for update) then
    raise exception 'Only an active Sprint can be closed' using errcode = '23514';
  end if;
  update public.sprint_tasks st set closure_disposition = case
    when t.status = 'completed' then 'completed'
    when t.status = 'cancelled' then 'cancelled'
    else d.disposition
  end
  from public.tasks t
  left join (
    select (item->>'task_id')::uuid task_id, item->>'disposition' disposition
    from jsonb_array_elements(coalesce(p_dispositions, '[]'::jsonb)) item
  ) d on d.task_id = t.id
  where st.sprint_id = p_sprint_id and st.task_id = t.id
    and (t.status in ('completed', 'cancelled') or d.disposition in ('recommitted', 'split', 'returned_to_future', 'cancelled'));
  if exists (select 1 from public.sprint_tasks where sprint_id = p_sprint_id and closure_disposition is null) then
    raise exception 'Every Sprint commitment requires a closure disposition' using errcode = '23514';
  end if;
  update public.sprints set status = 'closed', actual_result = nullif(btrim(p_actual_result), ''), learning = nullif(btrim(p_learning), '') where id = p_sprint_id;
end;
$$;

revoke all on table public.sprints, public.sprint_tasks from anon, authenticated;
grant select on table public.sprints, public.sprint_tasks to authenticated;
revoke all on function public.create_sprint(jsonb, uuid[]) from public, anon;
revoke all on function public.activate_sprint(uuid) from public, anon;
revoke all on function public.add_sprint_tasks(uuid, uuid[]) from public, anon;
revoke all on function public.remove_sprint_task(uuid, uuid) from public, anon;
revoke all on function public.cancel_sprint(uuid) from public, anon;
revoke all on function public.close_sprint(uuid, text, text, jsonb) from public, anon;
grant execute on function public.create_sprint(jsonb, uuid[]) to authenticated;
grant execute on function public.activate_sprint(uuid) to authenticated;
grant execute on function public.add_sprint_tasks(uuid, uuid[]) to authenticated;
grant execute on function public.remove_sprint_task(uuid, uuid) to authenticated;
grant execute on function public.cancel_sprint(uuid) to authenticated;
grant execute on function public.close_sprint(uuid, text, text, jsonb) to authenticated;

commit;
