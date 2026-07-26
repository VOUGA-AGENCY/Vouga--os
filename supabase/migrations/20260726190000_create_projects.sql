begin;

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  client_company_id uuid not null references public.companies (id) on delete restrict,
  owner_member_id uuid not null references public.members (id) on delete restrict,
  status text not null default 'not_started',
  starts_on date not null,
  target_delivery_on date not null,
  agreed_amount_minor bigint not null,
  received_amount_minor bigint not null default 0,
  currency text not null,
  objective text not null,
  expected_result text not null,
  next_task_id uuid references public.tasks (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint projects_name_length_check check (char_length(btrim(name)) between 1 and 160),
  constraint projects_status_check check (
    status in ('not_started', 'in_progress', 'waiting_client', 'delivered', 'closed')
  ),
  constraint projects_dates_check check (target_delivery_on >= starts_on),
  constraint projects_agreed_amount_check check (agreed_amount_minor > 0),
  constraint projects_received_amount_check check (
    received_amount_minor >= 0 and received_amount_minor <= agreed_amount_minor
  ),
  constraint projects_currency_check check (currency ~ '^[A-Z]{3}$'),
  constraint projects_objective_length_check check (
    char_length(btrim(objective)) between 1 and 800
  ),
  constraint projects_expected_result_length_check check (
    char_length(btrim(expected_result)) between 1 and 800
  )
);

create index projects_status_delivery_idx
on public.projects (status, target_delivery_on);
create index projects_client_company_id_idx
on public.projects (client_company_id);
create index projects_owner_member_id_idx
on public.projects (owner_member_id);

create table public.project_members (
  project_id uuid not null references public.projects (id) on delete cascade,
  member_id uuid not null references public.members (id) on delete restrict,
  primary key (project_id, member_id)
);
create index project_members_member_id_idx on public.project_members (member_id);

create table public.project_contacts (
  project_id uuid not null references public.projects (id) on delete cascade,
  contact_id uuid not null references public.contacts (id) on delete restrict,
  primary key (project_id, contact_id)
);
create index project_contacts_contact_id_idx on public.project_contacts (contact_id);

create table public.project_tasks (
  project_id uuid not null references public.projects (id) on delete cascade,
  task_id uuid not null references public.tasks (id) on delete restrict,
  primary key (project_id, task_id)
);
create index project_tasks_task_id_idx on public.project_tasks (task_id);

create table public.project_meetings (
  project_id uuid not null references public.projects (id) on delete cascade,
  meeting_id uuid not null references public.meetings (id) on delete restrict,
  primary key (project_id, meeting_id)
);
create index project_meetings_meeting_id_idx on public.project_meetings (meeting_id);

create table public.project_decisions (
  project_id uuid not null references public.projects (id) on delete cascade,
  decision_id uuid not null references public.decisions (id) on delete restrict,
  primary key (project_id, decision_id)
);
create index project_decisions_decision_id_idx on public.project_decisions (decision_id);

create table public.project_costs (
  project_id uuid not null references public.projects (id) on delete cascade,
  cost_id uuid not null references public.costs (id) on delete restrict,
  primary key (project_id, cost_id)
);
create index project_costs_cost_id_idx on public.project_costs (cost_id);

create table public.project_scope_items (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  kind text not null,
  label text not null,
  position integer not null,
  constraint project_scope_items_kind_check check (kind in ('in_scope', 'out_of_scope')),
  constraint project_scope_items_label_length_check check (
    char_length(btrim(label)) between 1 and 240
  ),
  constraint project_scope_items_position_check check (position >= 0),
  unique (project_id, kind, position)
);
create index project_scope_items_project_id_idx on public.project_scope_items (project_id);

create table public.project_milestones (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  title text not null,
  position integer not null,
  completed_at timestamptz,
  constraint project_milestones_title_length_check check (
    char_length(btrim(title)) between 1 and 240
  ),
  constraint project_milestones_position_check check (position between 0 and 4),
  unique (project_id, position)
);
create index project_milestones_project_id_idx on public.project_milestones (project_id);

create table public.project_resources (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  title text not null,
  kind text,
  url text not null,
  position integer not null,
  constraint project_resources_title_length_check check (
    char_length(btrim(title)) between 1 and 160
  ),
  constraint project_resources_kind_length_check check (
    kind is null or char_length(btrim(kind)) between 1 and 80
  ),
  constraint project_resources_url_length_check check (
    char_length(btrim(url)) between 1 and 2048
  ),
  constraint project_resources_position_check check (position >= 0),
  unique (project_id, position)
);
create index project_resources_project_id_idx on public.project_resources (project_id);

create table public.project_status_changes (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  from_status text,
  to_status text not null,
  changed_by_member_id uuid not null references public.members (id) on delete restrict,
  changed_at timestamptz not null default now(),
  constraint project_status_changes_from_status_check check (
    from_status is null
    or from_status in ('not_started', 'in_progress', 'waiting_client', 'delivered', 'closed')
  ),
  constraint project_status_changes_to_status_check check (
    to_status in ('not_started', 'in_progress', 'waiting_client', 'delivered', 'closed')
  )
);
create index project_status_changes_project_time_idx
on public.project_status_changes (project_id, changed_at desc);

create trigger projects_set_updated_at before update on public.projects
for each row execute function public.set_updated_at();

create function public.require_active_project_owner() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if not exists (
    select 1 from public.members where id = new.owner_member_id and is_active = true
  ) then
    raise exception 'Project owner must be active' using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger projects_require_active_owner
before insert or update of owner_member_id on public.projects
for each row execute function public.require_active_project_owner();

alter table public.projects enable row level security;
alter table public.project_members enable row level security;
alter table public.project_contacts enable row level security;
alter table public.project_tasks enable row level security;
alter table public.project_meetings enable row level security;
alter table public.project_decisions enable row level security;
alter table public.project_costs enable row level security;
alter table public.project_scope_items enable row level security;
alter table public.project_milestones enable row level security;
alter table public.project_resources enable row level security;
alter table public.project_status_changes enable row level security;

create policy projects_select_authenticated on public.projects
for select to authenticated using (auth.uid() is not null);
create policy project_members_select_authenticated on public.project_members
for select to authenticated using (auth.uid() is not null);
create policy project_contacts_select_authenticated on public.project_contacts
for select to authenticated using (auth.uid() is not null);
create policy project_tasks_select_authenticated on public.project_tasks
for select to authenticated using (auth.uid() is not null);
create policy project_meetings_select_authenticated on public.project_meetings
for select to authenticated using (auth.uid() is not null);
create policy project_decisions_select_authenticated on public.project_decisions
for select to authenticated using (auth.uid() is not null);
create policy project_costs_select_authenticated on public.project_costs
for select to authenticated using (auth.uid() is not null);
create policy project_scope_items_select_authenticated on public.project_scope_items
for select to authenticated using (auth.uid() is not null);
create policy project_milestones_select_authenticated on public.project_milestones
for select to authenticated using (auth.uid() is not null);
create policy project_resources_select_authenticated on public.project_resources
for select to authenticated using (auth.uid() is not null);
create policy project_status_changes_select_authenticated on public.project_status_changes
for select to authenticated using (auth.uid() is not null);

create function public.assert_project_references(
  p_client_company_id uuid,
  p_owner_member_id uuid,
  p_member_ids uuid[],
  p_contact_ids uuid[],
  p_task_ids uuid[],
  p_meeting_ids uuid[],
  p_decision_ids uuid[],
  p_cost_ids uuid[],
  p_next_task_id uuid
) returns void language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if not exists (select 1 from public.companies where id = p_client_company_id) then
    raise exception 'Project client does not exist' using errcode = '23503';
  end if;
  if not exists (
    select 1 from public.members where id = p_owner_member_id and is_active = true
  ) then
    raise exception 'Project owner must be active' using errcode = '23514';
  end if;
  if exists (
    select 1
    from unnest(coalesce(p_member_ids, '{}'::uuid[])) selected(id)
    left join public.members on members.id = selected.id and members.is_active = true
    where members.id is null
  ) then
    raise exception 'Project members must be active' using errcode = '23514';
  end if;
  if exists (
    select 1
    from unnest(coalesce(p_contact_ids, '{}'::uuid[])) selected(id)
    left join public.contacts
      on contacts.id = selected.id and contacts.company_id = p_client_company_id
    where contacts.id is null
  ) then
    raise exception 'Project contacts must belong to its client' using errcode = '23514';
  end if;
  if exists (
    select 1
    from unnest(coalesce(p_meeting_ids, '{}'::uuid[])) selected(id)
    left join public.meetings on meetings.id = selected.id and meetings.kind <> 'vacation'
    where meetings.id is null
  ) then
    raise exception 'Project meetings cannot include vacations' using errcode = '23514';
  end if;
  if p_next_task_id is not null and not (
    p_next_task_id = any(coalesce(p_task_ids, '{}'::uuid[]))
  ) then
    raise exception 'Project next action must be a related Task' using errcode = '23514';
  end if;
  if p_next_task_id is not null and not exists (
    select 1 from public.tasks
    where id = p_next_task_id and status in ('todo', 'in_progress', 'blocked')
  ) then
    raise exception 'Project next action must be an open Task' using errcode = '23514';
  end if;
  perform 1 from public.tasks
  where id = any(coalesce(p_task_ids, '{}'::uuid[]));
  if (select count(distinct id) from unnest(coalesce(p_task_ids, '{}'::uuid[])) selected(id))
    <> (select count(*) from public.tasks where id = any(coalesce(p_task_ids, '{}'::uuid[]))) then
    raise exception 'A Project Task does not exist' using errcode = '23503';
  end if;
  if (select count(distinct id) from unnest(coalesce(p_decision_ids, '{}'::uuid[])) selected(id))
    <> (select count(*) from public.decisions where id = any(coalesce(p_decision_ids, '{}'::uuid[]))) then
    raise exception 'A Project Decision does not exist' using errcode = '23503';
  end if;
  if (select count(distinct id) from unnest(coalesce(p_cost_ids, '{}'::uuid[])) selected(id))
    <> (select count(*) from public.costs where id = any(coalesce(p_cost_ids, '{}'::uuid[]))) then
    raise exception 'A Project Cost does not exist' using errcode = '23503';
  end if;
end;
$$;

create function public.replace_project_relations(
  p_project_id uuid,
  p_owner_member_id uuid,
  p_member_ids uuid[],
  p_contact_ids uuid[],
  p_task_ids uuid[],
  p_meeting_ids uuid[],
  p_decision_ids uuid[],
  p_cost_ids uuid[]
) returns void language plpgsql security definer set search_path = public, pg_temp as $$
begin
  delete from public.project_members where project_id = p_project_id;
  delete from public.project_contacts where project_id = p_project_id;
  delete from public.project_tasks where project_id = p_project_id;
  delete from public.project_meetings where project_id = p_project_id;
  delete from public.project_decisions where project_id = p_project_id;
  delete from public.project_costs where project_id = p_project_id;

  insert into public.project_members (project_id, member_id)
  select p_project_id, id
  from (
    select distinct unnest(
      array_append(coalesce(p_member_ids, '{}'::uuid[]), p_owner_member_id)
    ) id
  ) selected;
  insert into public.project_contacts (project_id, contact_id)
  select p_project_id, id
  from (select distinct unnest(coalesce(p_contact_ids, '{}'::uuid[])) id) selected;
  insert into public.project_tasks (project_id, task_id)
  select p_project_id, id
  from (select distinct unnest(coalesce(p_task_ids, '{}'::uuid[])) id) selected;
  insert into public.project_meetings (project_id, meeting_id)
  select p_project_id, id
  from (select distinct unnest(coalesce(p_meeting_ids, '{}'::uuid[])) id) selected;
  insert into public.project_decisions (project_id, decision_id)
  select p_project_id, id
  from (select distinct unnest(coalesce(p_decision_ids, '{}'::uuid[])) id) selected;
  insert into public.project_costs (project_id, cost_id)
  select p_project_id, id
  from (select distinct unnest(coalesce(p_cost_ids, '{}'::uuid[])) id) selected;
end;
$$;

create function public.replace_project_owned_items(
  p_project_id uuid,
  p_scope_items jsonb,
  p_out_of_scope_items jsonb,
  p_milestones jsonb,
  p_resources jsonb
) returns void language plpgsql security definer set search_path = public, pg_temp as $$
begin
  delete from public.project_scope_items where project_id = p_project_id;
  insert into public.project_scope_items (id, project_id, kind, label, position)
  select
    coalesce(nullif(item.value->>'id', '')::uuid, gen_random_uuid()),
    p_project_id,
    'in_scope',
    btrim(item.value->>'title'),
    (item.ordinality - 1)::integer
  from jsonb_array_elements(coalesce(p_scope_items, '[]'::jsonb))
    with ordinality as item(value, ordinality);
  insert into public.project_scope_items (id, project_id, kind, label, position)
  select
    coalesce(nullif(item.value->>'id', '')::uuid, gen_random_uuid()),
    p_project_id,
    'out_of_scope',
    btrim(item.value->>'title'),
    (item.ordinality - 1)::integer
  from jsonb_array_elements(coalesce(p_out_of_scope_items, '[]'::jsonb))
    with ordinality as item(value, ordinality);

  delete from public.project_milestones where project_id = p_project_id;
  insert into public.project_milestones (id, project_id, title, position, completed_at)
  select
    coalesce(nullif(item.value->>'id', '')::uuid, gen_random_uuid()),
    p_project_id,
    btrim(item.value->>'title'),
    (item.ordinality - 1)::integer,
    nullif(item.value->>'completed_at', '')::timestamptz
  from jsonb_array_elements(coalesce(p_milestones, '[]'::jsonb))
    with ordinality as item(value, ordinality);

  delete from public.project_resources where project_id = p_project_id;
  insert into public.project_resources (id, project_id, title, kind, url, position)
  select
    coalesce(nullif(item.value->>'id', '')::uuid, gen_random_uuid()),
    p_project_id,
    btrim(item.value->>'title'),
    nullif(btrim(item.value->>'kind'), ''),
    btrim(item.value->>'url'),
    (item.ordinality - 1)::integer
  from jsonb_array_elements(coalesce(p_resources, '[]'::jsonb))
    with ordinality as item(value, ordinality);
end;
$$;

create function public.create_project(
  p_values jsonb,
  p_member_ids uuid[],
  p_contact_ids uuid[],
  p_task_ids uuid[],
  p_meeting_ids uuid[],
  p_decision_ids uuid[],
  p_cost_ids uuid[],
  p_scope_items jsonb,
  p_out_of_scope_items jsonb,
  p_milestones jsonb,
  p_resources jsonb
) returns uuid language plpgsql security definer set search_path = public, pg_temp as $$
declare
  saved_id uuid;
  selected_client uuid := (p_values->>'client_company_id')::uuid;
  selected_owner uuid := (p_values->>'owner_member_id')::uuid;
  selected_next_task uuid := nullif(p_values->>'next_task_id', '')::uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  perform public.assert_project_references(
    selected_client, selected_owner, p_member_ids, p_contact_ids, p_task_ids,
    p_meeting_ids, p_decision_ids, p_cost_ids, selected_next_task
  );
  insert into public.projects (
    name, client_company_id, owner_member_id, starts_on, target_delivery_on,
    agreed_amount_minor, received_amount_minor, currency, objective,
    expected_result, next_task_id
  ) values (
    btrim(p_values->>'name'),
    selected_client,
    selected_owner,
    (p_values->>'starts_on')::date,
    (p_values->>'target_delivery_on')::date,
    (p_values->>'agreed_amount_minor')::bigint,
    (p_values->>'received_amount_minor')::bigint,
    upper(p_values->>'currency'),
    btrim(p_values->>'objective'),
    btrim(p_values->>'expected_result'),
    selected_next_task
  ) returning id into saved_id;
  perform public.replace_project_relations(
    saved_id, selected_owner, p_member_ids, p_contact_ids, p_task_ids,
    p_meeting_ids, p_decision_ids, p_cost_ids
  );
  perform public.replace_project_owned_items(
    saved_id, p_scope_items, p_out_of_scope_items, p_milestones, p_resources
  );
  insert into public.project_status_changes (
    project_id, from_status, to_status, changed_by_member_id
  ) values (saved_id, null, 'not_started', auth.uid());
  return saved_id;
end;
$$;

create function public.update_project(
  p_project_id uuid,
  p_values jsonb,
  p_member_ids uuid[],
  p_contact_ids uuid[],
  p_task_ids uuid[],
  p_meeting_ids uuid[],
  p_decision_ids uuid[],
  p_cost_ids uuid[],
  p_scope_items jsonb,
  p_out_of_scope_items jsonb,
  p_milestones jsonb,
  p_resources jsonb
) returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare
  selected_client uuid := (p_values->>'client_company_id')::uuid;
  selected_owner uuid := (p_values->>'owner_member_id')::uuid;
  selected_next_task uuid := nullif(p_values->>'next_task_id', '')::uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if not exists (
    select 1 from public.projects
    where id = p_project_id and status <> 'closed'
    for update
  ) then
    raise exception 'Project not found or closed' using errcode = 'P0002';
  end if;
  perform public.assert_project_references(
    selected_client, selected_owner, p_member_ids, p_contact_ids, p_task_ids,
    p_meeting_ids, p_decision_ids, p_cost_ids, selected_next_task
  );
  update public.projects set
    name = btrim(p_values->>'name'),
    client_company_id = selected_client,
    owner_member_id = selected_owner,
    starts_on = (p_values->>'starts_on')::date,
    target_delivery_on = (p_values->>'target_delivery_on')::date,
    agreed_amount_minor = (p_values->>'agreed_amount_minor')::bigint,
    received_amount_minor = (p_values->>'received_amount_minor')::bigint,
    currency = upper(p_values->>'currency'),
    objective = btrim(p_values->>'objective'),
    expected_result = btrim(p_values->>'expected_result'),
    next_task_id = selected_next_task
  where id = p_project_id;
  perform public.replace_project_relations(
    p_project_id, selected_owner, p_member_ids, p_contact_ids, p_task_ids,
    p_meeting_ids, p_decision_ids, p_cost_ids
  );
  perform public.replace_project_owned_items(
    p_project_id, p_scope_items, p_out_of_scope_items, p_milestones, p_resources
  );
end;
$$;

create function public.transition_project(p_project_id uuid, p_next_status text) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  previous_status text;
  allowed boolean := false;
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  select status into previous_status
  from public.projects
  where id = p_project_id
  for update;
  if previous_status is null then
    raise exception 'Project not found' using errcode = 'P0002';
  end if;
  allowed :=
    (previous_status = 'not_started' and p_next_status = 'in_progress')
    or (previous_status = 'in_progress' and p_next_status in ('waiting_client', 'delivered'))
    or (previous_status = 'waiting_client' and p_next_status in ('in_progress', 'delivered'))
    or (previous_status = 'delivered' and p_next_status in ('in_progress', 'closed'));
  if not allowed then
    raise exception 'Invalid Project status transition' using errcode = '23514';
  end if;
  update public.projects set status = p_next_status where id = p_project_id;
  insert into public.project_status_changes (
    project_id, from_status, to_status, changed_by_member_id
  ) values (p_project_id, previous_status, p_next_status, auth.uid());
end;
$$;

revoke all on table
  public.projects,
  public.project_members,
  public.project_contacts,
  public.project_tasks,
  public.project_meetings,
  public.project_decisions,
  public.project_costs,
  public.project_scope_items,
  public.project_milestones,
  public.project_resources,
  public.project_status_changes
from anon, authenticated;

grant select on table
  public.projects,
  public.project_members,
  public.project_contacts,
  public.project_tasks,
  public.project_meetings,
  public.project_decisions,
  public.project_costs,
  public.project_scope_items,
  public.project_milestones,
  public.project_resources,
  public.project_status_changes
to authenticated;

revoke all on function public.assert_project_references(
  uuid, uuid, uuid[], uuid[], uuid[], uuid[], uuid[], uuid[], uuid
) from public, anon, authenticated;
revoke all on function public.replace_project_relations(
  uuid, uuid, uuid[], uuid[], uuid[], uuid[], uuid[], uuid[]
) from public, anon, authenticated;
revoke all on function public.replace_project_owned_items(
  uuid, jsonb, jsonb, jsonb, jsonb
) from public, anon, authenticated;
revoke all on function public.create_project(
  jsonb, uuid[], uuid[], uuid[], uuid[], uuid[], uuid[], jsonb, jsonb, jsonb, jsonb
) from public, anon;
revoke all on function public.update_project(
  uuid, jsonb, uuid[], uuid[], uuid[], uuid[], uuid[], uuid[], jsonb, jsonb, jsonb, jsonb
) from public, anon;
revoke all on function public.transition_project(uuid, text) from public, anon;

grant execute on function public.create_project(
  jsonb, uuid[], uuid[], uuid[], uuid[], uuid[], uuid[], jsonb, jsonb, jsonb, jsonb
) to authenticated;
grant execute on function public.update_project(
  uuid, jsonb, uuid[], uuid[], uuid[], uuid[], uuid[], uuid[], jsonb, jsonb, jsonb, jsonb
) to authenticated;
grant execute on function public.transition_project(uuid, text) to authenticated;

commit;
