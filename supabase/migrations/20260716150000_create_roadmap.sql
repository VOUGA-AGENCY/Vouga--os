begin;

create table public.roadmap_items (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  kind text not null,
  description text not null,
  evidence text not null,
  horizon text not null,
  lifecycle_status text not null default 'active',
  owner_member_id uuid references public.members (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint roadmap_items_title_length_check check (char_length(btrim(title)) between 1 and 160),
  constraint roadmap_items_kind_check check (kind in ('problem', 'outcome', 'hypothesis')),
  constraint roadmap_items_description_length_check check (char_length(btrim(description)) between 1 and 4000),
  constraint roadmap_items_evidence_length_check check (char_length(btrim(evidence)) between 1 and 4000),
  constraint roadmap_items_horizon_check check (horizon in ('now', 'next', 'later')),
  constraint roadmap_items_lifecycle_status_check check (lifecycle_status in ('active', 'completed', 'abandoned')),
  constraint roadmap_items_now_owner_check check (horizon <> 'now' or owner_member_id is not null)
);
create index roadmap_items_active_horizon_updated_idx on public.roadmap_items (horizon, updated_at desc) where lifecycle_status = 'active';
create index roadmap_items_lifecycle_updated_idx on public.roadmap_items (lifecycle_status, updated_at desc);
create index roadmap_items_owner_member_id_idx on public.roadmap_items (owner_member_id) where owner_member_id is not null;

create table public.roadmap_item_companies (
  roadmap_item_id uuid not null references public.roadmap_items (id) on delete cascade,
  company_id uuid not null references public.companies (id) on delete restrict,
  primary key (roadmap_item_id, company_id)
);
create index roadmap_item_companies_company_id_idx on public.roadmap_item_companies (company_id);
create table public.roadmap_item_tasks (
  roadmap_item_id uuid not null references public.roadmap_items (id) on delete cascade,
  task_id uuid not null references public.tasks (id) on delete restrict,
  primary key (roadmap_item_id, task_id)
);
create index roadmap_item_tasks_task_id_idx on public.roadmap_item_tasks (task_id);
create table public.roadmap_item_sprints (
  roadmap_item_id uuid not null references public.roadmap_items (id) on delete cascade,
  sprint_id uuid not null references public.sprints (id) on delete restrict,
  primary key (roadmap_item_id, sprint_id)
);
create index roadmap_item_sprints_sprint_id_idx on public.roadmap_item_sprints (sprint_id);
create table public.roadmap_item_decisions (
  roadmap_item_id uuid not null references public.roadmap_items (id) on delete cascade,
  decision_id uuid not null references public.decisions (id) on delete restrict,
  primary key (roadmap_item_id, decision_id)
);
create index roadmap_item_decisions_decision_id_idx on public.roadmap_item_decisions (decision_id);

create trigger roadmap_items_set_updated_at before update on public.roadmap_items
for each row execute function public.set_updated_at();

create function public.require_active_roadmap_owner() returns trigger language plpgsql security definer
set search_path = public, pg_temp as $$
begin
  if new.owner_member_id is not null and not exists (
    select 1 from public.members where id = new.owner_member_id and is_active = true
  ) then raise exception 'Roadmap Item owner must be active' using errcode = '23514'; end if;
  return new;
end;
$$;
create trigger roadmap_items_require_active_owner before insert or update of owner_member_id on public.roadmap_items
for each row execute function public.require_active_roadmap_owner();

alter table public.roadmap_items enable row level security;
alter table public.roadmap_item_companies enable row level security;
alter table public.roadmap_item_tasks enable row level security;
alter table public.roadmap_item_sprints enable row level security;
alter table public.roadmap_item_decisions enable row level security;
create policy roadmap_items_select_authenticated on public.roadmap_items for select to authenticated using (auth.uid() is not null);
create policy roadmap_item_companies_select_authenticated on public.roadmap_item_companies for select to authenticated using (auth.uid() is not null);
create policy roadmap_item_tasks_select_authenticated on public.roadmap_item_tasks for select to authenticated using (auth.uid() is not null);
create policy roadmap_item_sprints_select_authenticated on public.roadmap_item_sprints for select to authenticated using (auth.uid() is not null);
create policy roadmap_item_decisions_select_authenticated on public.roadmap_item_decisions for select to authenticated using (auth.uid() is not null);

create function public.replace_roadmap_item_relations(
  p_item_id uuid, p_company_ids uuid[], p_task_ids uuid[], p_sprint_ids uuid[], p_decision_ids uuid[]
) returns void language plpgsql security definer set search_path = public, pg_temp as $$
begin
  delete from public.roadmap_item_companies where roadmap_item_id = p_item_id;
  delete from public.roadmap_item_tasks where roadmap_item_id = p_item_id;
  delete from public.roadmap_item_sprints where roadmap_item_id = p_item_id;
  delete from public.roadmap_item_decisions where roadmap_item_id = p_item_id;
  insert into public.roadmap_item_companies select p_item_id, id from (select distinct unnest(coalesce(p_company_ids, '{}'::uuid[])) id) selected;
  insert into public.roadmap_item_tasks select p_item_id, id from (select distinct unnest(coalesce(p_task_ids, '{}'::uuid[])) id) selected;
  insert into public.roadmap_item_sprints select p_item_id, id from (select distinct unnest(coalesce(p_sprint_ids, '{}'::uuid[])) id) selected;
  insert into public.roadmap_item_decisions select p_item_id, id from (select distinct unnest(coalesce(p_decision_ids, '{}'::uuid[])) id) selected;
end;
$$;

create function public.create_roadmap_item(
  p_values jsonb, p_company_ids uuid[], p_task_ids uuid[], p_sprint_ids uuid[], p_decision_ids uuid[]
) returns uuid language plpgsql security definer set search_path = public, pg_temp as $$
declare saved_id uuid; selected_horizon text;
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  selected_horizon := p_values->>'horizon';
  if selected_horizon = 'now' and coalesce(cardinality(p_task_ids), 0) = 0 then
    raise exception 'A Now Roadmap Item requires at least one related Task' using errcode = '23514';
  end if;
  insert into public.roadmap_items (title, kind, description, evidence, horizon, owner_member_id)
  values (btrim(p_values->>'title'), p_values->>'kind', btrim(p_values->>'description'), btrim(p_values->>'evidence'), selected_horizon, nullif(p_values->>'owner_member_id', '')::uuid)
  returning id into saved_id;
  perform public.replace_roadmap_item_relations(saved_id, p_company_ids, p_task_ids, p_sprint_ids, p_decision_ids);
  return saved_id;
end;
$$;

create function public.update_roadmap_item(
  p_item_id uuid, p_values jsonb, p_company_ids uuid[], p_task_ids uuid[], p_sprint_ids uuid[], p_decision_ids uuid[], p_horizon_decision_id uuid
) returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare previous_horizon text; selected_horizon text;
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  select horizon into previous_horizon from public.roadmap_items where id = p_item_id and lifecycle_status = 'active' for update;
  if previous_horizon is null then raise exception 'Roadmap Item not found or no longer editable' using errcode = 'P0002'; end if;
  selected_horizon := p_values->>'horizon';
  if selected_horizon = 'now' and coalesce(cardinality(p_task_ids), 0) = 0 then raise exception 'A Now Roadmap Item requires at least one related Task' using errcode = '23514'; end if;
  if previous_horizon <> selected_horizon and (
    p_horizon_decision_id is null or not (p_horizon_decision_id = any(coalesce(p_decision_ids, '{}'::uuid[])))
  ) then raise exception 'A horizon change requires a related Decision' using errcode = '23514'; end if;
  update public.roadmap_items set title = btrim(p_values->>'title'), kind = p_values->>'kind', description = btrim(p_values->>'description'), evidence = btrim(p_values->>'evidence'), horizon = selected_horizon, owner_member_id = nullif(p_values->>'owner_member_id', '')::uuid where id = p_item_id;
  perform public.replace_roadmap_item_relations(p_item_id, p_company_ids, p_task_ids, p_sprint_ids, p_decision_ids);
end;
$$;

create function public.finish_roadmap_item(p_item_id uuid, p_status text) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if p_status not in ('completed', 'abandoned') then raise exception 'Invalid terminal Roadmap Item status' using errcode = '23514'; end if;
  update public.roadmap_items set lifecycle_status = p_status where id = p_item_id and lifecycle_status = 'active';
  if not found then raise exception 'Roadmap Item not found or already terminal' using errcode = 'P0002'; end if;
end;
$$;

revoke all on table public.roadmap_items, public.roadmap_item_companies, public.roadmap_item_tasks, public.roadmap_item_sprints, public.roadmap_item_decisions from anon, authenticated;
grant select on table public.roadmap_items, public.roadmap_item_companies, public.roadmap_item_tasks, public.roadmap_item_sprints, public.roadmap_item_decisions to authenticated;
revoke all on function public.replace_roadmap_item_relations(uuid, uuid[], uuid[], uuid[], uuid[]) from public, anon, authenticated;
revoke all on function public.create_roadmap_item(jsonb, uuid[], uuid[], uuid[], uuid[]) from public, anon;
revoke all on function public.update_roadmap_item(uuid, jsonb, uuid[], uuid[], uuid[], uuid[], uuid) from public, anon;
revoke all on function public.finish_roadmap_item(uuid, text) from public, anon;
grant execute on function public.create_roadmap_item(jsonb, uuid[], uuid[], uuid[], uuid[]) to authenticated;
grant execute on function public.update_roadmap_item(uuid, jsonb, uuid[], uuid[], uuid[], uuid[], uuid) to authenticated;
grant execute on function public.finish_roadmap_item(uuid, text) to authenticated;

commit;
