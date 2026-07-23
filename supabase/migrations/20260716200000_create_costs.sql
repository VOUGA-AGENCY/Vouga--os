begin;

create table public.costs (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null,
  category text not null,
  supplier text,
  expected_amount_minor bigint not null,
  actual_amount_minor bigint,
  currency text not null,
  cost_type text not null,
  recurrence text,
  expected_on date,
  starts_on date,
  billing_anchor_on date,
  paid_on date,
  ended_on date,
  cancelled_on date,
  status text not null default 'planned',
  owner_member_id uuid references public.members (id) on delete restrict,
  company_id uuid references public.companies (id) on delete restrict,
  roadmap_item_id uuid references public.roadmap_items (id) on delete restrict,
  source_decision_id uuid references public.decisions (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint costs_title_length_check check (char_length(btrim(title)) between 1 and 160),
  constraint costs_description_length_check check (char_length(btrim(description)) between 1 and 4000),
  constraint costs_supplier_length_check check (supplier is null or char_length(btrim(supplier)) between 1 and 200),
  constraint costs_category_check check (category in ('software','infrastructure','professional_services','marketing_sales','workspace_operations','travel','other')),
  constraint costs_expected_amount_check check (expected_amount_minor > 0),
  constraint costs_actual_amount_check check (actual_amount_minor is null or actual_amount_minor > 0),
  constraint costs_currency_check check (currency ~ '^[A-Z]{3}$'),
  constraint costs_type_check check (cost_type in ('one_off','recurring')),
  constraint costs_recurrence_check check (recurrence is null or recurrence in ('monthly','quarterly','yearly')),
  constraint costs_status_check check (status in ('planned','active','paid','ended','cancelled')),
  constraint costs_shape_check check (
    (cost_type = 'one_off' and expected_on is not null and recurrence is null and starts_on is null and billing_anchor_on is null)
    or
    (cost_type = 'recurring' and expected_on is null and recurrence is not null and starts_on is not null and billing_anchor_on is not null and billing_anchor_on >= starts_on)
  ),
  constraint costs_status_dates_check check (
    (status = 'planned' and paid_on is null and ended_on is null and cancelled_on is null and actual_amount_minor is null)
    or (status = 'active' and cost_type = 'recurring' and owner_member_id is not null and paid_on is null and ended_on is null and cancelled_on is null and actual_amount_minor is null)
    or (status = 'paid' and cost_type = 'one_off' and owner_member_id is not null and paid_on is not null and actual_amount_minor is not null and ended_on is null and cancelled_on is null)
    or (status = 'ended' and cost_type = 'recurring' and owner_member_id is not null and ended_on is not null and paid_on is null and cancelled_on is null and actual_amount_minor is null)
    or (status = 'cancelled' and cancelled_on is not null and paid_on is null and ended_on is null and actual_amount_minor is null)
  )
);

create table public.cost_tasks (
  cost_id uuid not null references public.costs (id) on delete cascade,
  task_id uuid not null references public.tasks (id) on delete restrict,
  primary key (cost_id, task_id)
);

create table public.cash_balance_snapshots (
  id uuid primary key default gen_random_uuid(),
  balance_minor bigint not null,
  currency text not null,
  confirmed_at timestamptz not null,
  confirmed_by_member_id uuid not null references public.members (id) on delete restrict,
  description text,
  created_at timestamptz not null default now(),
  constraint cash_balance_snapshots_balance_check check (balance_minor >= 0),
  constraint cash_balance_snapshots_currency_check check (currency ~ '^[A-Z]{3}$'),
  constraint cash_balance_snapshots_description_check check (description is null or char_length(btrim(description)) between 1 and 500)
);

create index costs_status_date_idx on public.costs (status, expected_on, billing_anchor_on);
create index costs_type_status_idx on public.costs (cost_type, status);
create index costs_category_idx on public.costs (category);
create index costs_company_id_idx on public.costs (company_id) where company_id is not null;
create index costs_roadmap_item_id_idx on public.costs (roadmap_item_id) where roadmap_item_id is not null;
create index costs_source_decision_id_idx on public.costs (source_decision_id) where source_decision_id is not null;
create index costs_owner_member_id_idx on public.costs (owner_member_id) where owner_member_id is not null;
create index cost_tasks_task_id_idx on public.cost_tasks (task_id);
create index cash_balance_snapshots_currency_confirmed_idx on public.cash_balance_snapshots (currency, confirmed_at desc);

create trigger costs_set_updated_at before update on public.costs
for each row execute function public.set_updated_at();

create function public.require_active_cost_member() returns trigger language plpgsql security definer
set search_path = public, pg_temp as $$
begin
  if new.owner_member_id is not null and not exists (
    select 1 from public.members where id = new.owner_member_id and is_active = true
  ) then raise exception 'Cost owner must be active' using errcode = '23514'; end if;
  return new;
end;
$$;
create trigger costs_require_active_owner before insert or update of owner_member_id on public.costs
for each row execute function public.require_active_cost_member();

create function public.prevent_cash_balance_snapshot_changes() returns trigger language plpgsql as $$
begin
  raise exception 'Cash balance snapshots are append-only' using errcode = '23514';
end;
$$;
create trigger cash_balance_snapshots_append_only before update or delete on public.cash_balance_snapshots
for each row execute function public.prevent_cash_balance_snapshot_changes();

alter table public.costs enable row level security;
alter table public.cost_tasks enable row level security;
alter table public.cash_balance_snapshots enable row level security;
create policy costs_select_authenticated on public.costs for select to authenticated using (auth.uid() is not null);
create policy cost_tasks_select_authenticated on public.cost_tasks for select to authenticated using (auth.uid() is not null);
create policy cash_balance_snapshots_select_authenticated on public.cash_balance_snapshots for select to authenticated using (auth.uid() is not null);

create function public.replace_cost_tasks(p_cost_id uuid, p_task_ids uuid[]) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  delete from public.cost_tasks where cost_id = p_cost_id;
  insert into public.cost_tasks
  select p_cost_id, id from (select distinct unnest(coalesce(p_task_ids, '{}'::uuid[])) id) selected;
end;
$$;

create function public.create_cost(p_values jsonb, p_task_ids uuid[]) returns uuid
language plpgsql security definer set search_path = public, pg_temp as $$
declare saved_id uuid;
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  insert into public.costs (
    title, description, category, supplier, expected_amount_minor, currency, cost_type,
    recurrence, expected_on, starts_on, billing_anchor_on, owner_member_id, company_id,
    roadmap_item_id, source_decision_id
  ) values (
    btrim(p_values->>'title'), btrim(p_values->>'description'), p_values->>'category',
    nullif(btrim(p_values->>'supplier'), ''), (p_values->>'expected_amount_minor')::bigint,
    upper(p_values->>'currency'), p_values->>'cost_type', nullif(p_values->>'recurrence', ''),
    nullif(p_values->>'expected_on', '')::date, nullif(p_values->>'starts_on', '')::date,
    nullif(p_values->>'billing_anchor_on', '')::date, nullif(p_values->>'owner_member_id', '')::uuid,
    nullif(p_values->>'company_id', '')::uuid, nullif(p_values->>'roadmap_item_id', '')::uuid,
    nullif(p_values->>'source_decision_id', '')::uuid
  ) returning id into saved_id;
  perform public.replace_cost_tasks(saved_id, p_task_ids);
  return saved_id;
end;
$$;

create function public.update_cost(p_cost_id uuid, p_values jsonb, p_task_ids uuid[]) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare current_cost public.costs%rowtype;
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  select * into current_cost from public.costs where id = p_cost_id and status in ('planned','active') for update;
  if not found then raise exception 'Cost not found or no longer editable' using errcode = 'P0002'; end if;
  if current_cost.cost_type <> p_values->>'cost_type' then raise exception 'Cost type is immutable' using errcode = '23514'; end if;
  if current_cost.status = 'active' and (
    current_cost.expected_amount_minor <> (p_values->>'expected_amount_minor')::bigint
    or current_cost.currency <> upper(p_values->>'currency')
    or current_cost.recurrence is distinct from nullif(p_values->>'recurrence', '')
    or current_cost.billing_anchor_on is distinct from nullif(p_values->>'billing_anchor_on', '')::date
  ) then raise exception 'Active financial fields are immutable' using errcode = '23514'; end if;
  update public.costs set
    title=btrim(p_values->>'title'), description=btrim(p_values->>'description'),
    category=p_values->>'category', supplier=nullif(btrim(p_values->>'supplier'), ''),
    expected_amount_minor=(p_values->>'expected_amount_minor')::bigint,
    currency=upper(p_values->>'currency'), recurrence=nullif(p_values->>'recurrence', ''),
    expected_on=nullif(p_values->>'expected_on', '')::date,
    starts_on=nullif(p_values->>'starts_on', '')::date,
    billing_anchor_on=nullif(p_values->>'billing_anchor_on', '')::date,
    owner_member_id=nullif(p_values->>'owner_member_id', '')::uuid,
    company_id=nullif(p_values->>'company_id', '')::uuid,
    roadmap_item_id=nullif(p_values->>'roadmap_item_id', '')::uuid,
    source_decision_id=nullif(p_values->>'source_decision_id', '')::uuid
  where id = p_cost_id;
  perform public.replace_cost_tasks(p_cost_id, p_task_ids);
end;
$$;

create function public.transition_cost(
  p_cost_id uuid, p_action text, p_effective_on date, p_actual_amount_minor bigint default null
) returns void language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if p_action = 'activate' then
    update public.costs set status='active'
    where id=p_cost_id and status='planned' and cost_type='recurring' and owner_member_id is not null;
  elsif p_action = 'pay' then
    update public.costs set status='paid', paid_on=p_effective_on, actual_amount_minor=p_actual_amount_minor
    where id=p_cost_id and status='planned' and cost_type='one_off' and owner_member_id is not null and p_effective_on is not null and p_actual_amount_minor > 0;
  elsif p_action = 'end' then
    update public.costs set status='ended', ended_on=p_effective_on
    where id=p_cost_id and status='active' and cost_type='recurring' and p_effective_on >= starts_on;
  elsif p_action = 'cancel' then
    update public.costs set status='cancelled', cancelled_on=p_effective_on
    where id=p_cost_id and status in ('planned','active') and p_effective_on is not null;
  else
    raise exception 'Invalid Cost transition' using errcode = '23514';
  end if;
  if not found then raise exception 'Invalid Cost transition' using errcode = '23514'; end if;
end;
$$;

create function public.create_cash_balance_snapshot(
  p_balance_minor bigint, p_currency text, p_confirmed_at timestamptz,
  p_confirmed_by_member_id uuid, p_description text
) returns uuid language plpgsql security definer set search_path = public, pg_temp as $$
declare saved_id uuid;
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if not exists (select 1 from public.members where id=p_confirmed_by_member_id and is_active=true) then
    raise exception 'Confirming member must be active' using errcode = '23514';
  end if;
  insert into public.cash_balance_snapshots (
    balance_minor, currency, confirmed_at, confirmed_by_member_id, description
  ) values (
    p_balance_minor, upper(p_currency), p_confirmed_at, p_confirmed_by_member_id,
    nullif(btrim(p_description), '')
  ) returning id into saved_id;
  return saved_id;
end;
$$;

revoke all on table public.costs, public.cost_tasks, public.cash_balance_snapshots from anon, authenticated;
grant select on table public.costs, public.cost_tasks, public.cash_balance_snapshots to authenticated;
revoke all on function public.replace_cost_tasks(uuid, uuid[]) from public, anon, authenticated;
revoke all on function public.create_cost(jsonb, uuid[]) from public, anon;
revoke all on function public.update_cost(uuid, jsonb, uuid[]) from public, anon;
revoke all on function public.transition_cost(uuid, text, date, bigint) from public, anon;
revoke all on function public.create_cash_balance_snapshot(bigint, text, timestamptz, uuid, text) from public, anon;
grant execute on function public.create_cost(jsonb, uuid[]) to authenticated;
grant execute on function public.update_cost(uuid, jsonb, uuid[]) to authenticated;
grant execute on function public.transition_cost(uuid, text, date, bigint) to authenticated;
grant execute on function public.create_cash_balance_snapshot(bigint, text, timestamptz, uuid, text) to authenticated;

commit;
