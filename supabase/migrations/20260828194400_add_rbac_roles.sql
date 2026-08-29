begin;

-- 1. Add role column to members table (defaulting to 'admin' for existing members)
alter table public.members
  add column role text not null default 'admin'
  constraint members_role_check check (role in ('admin', 'engineer'));

-- 2. Alter the default for future members to 'engineer'
alter table public.members
  alter column role set default 'engineer';

-- 3. Define public.is_admin helper function
create or replace function public.is_admin(p_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  return exists (
    select 1
    from public.members
    where id = p_user_id
      and role = 'admin'
      and is_active = true
  );
end;
$$;

-- 4. Update sync_auth_user_to_member trigger function to handle roles gracefully
create or replace function public.sync_auth_user_to_member()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  member_email text;
  member_name text;
  member_role text;
begin
  member_email := coalesce(new.email, new.id::text || '@auth.local');
  member_name := coalesce(
    nullif(btrim(new.raw_user_meta_data ->> 'full_name'), ''),
    nullif(btrim(new.raw_user_meta_data ->> 'name'), ''),
    split_part(member_email, '@', 1)
  );
  member_role := coalesce(
    nullif(btrim(new.raw_user_meta_data ->> 'role'), ''),
    (select role from public.members where id = new.id),
    'engineer'
  );

  insert into public.members (id, display_name, email, role)
  values (new.id, member_name, member_email, member_role)
  on conflict (id) do update
    set display_name = excluded.display_name,
        email = excluded.email,
        role = excluded.role,
        updated_at = now();

  return new;
end;
$$;

-- 5. Restrict costs and snapshots RLS select policies to Admin only
drop policy if exists costs_select_authenticated on public.costs;
create policy costs_select_admin_only on public.costs
  for select to authenticated using (public.is_admin(auth.uid()));

drop policy if exists cost_tasks_select_authenticated on public.cost_tasks;
create policy cost_tasks_select_admin_only on public.cost_tasks
  for select to authenticated using (public.is_admin(auth.uid()));

drop policy if exists cash_balance_snapshots_select_authenticated on public.cash_balance_snapshots;
create policy cash_balance_snapshots_select_admin_only on public.cash_balance_snapshots
  for select to authenticated using (public.is_admin(auth.uid()));

-- 6. Enforce Admin checks in costs and snapshots Postgres write functions
create or replace function public.create_cost(p_values jsonb, p_task_ids uuid[]) returns uuid
language plpgsql security definer set search_path = public, pg_temp as $$
declare saved_id uuid;
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if not public.is_admin(auth.uid()) then raise exception 'Access denied: Admin role required' using errcode = '42501'; end if;
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

create or replace function public.update_cost(p_cost_id uuid, p_values jsonb, p_task_ids uuid[]) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare current_cost public.costs%rowtype;
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if not public.is_admin(auth.uid()) then raise exception 'Access denied: Admin role required' using errcode = '42501'; end if;
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

create or replace function public.transition_cost(
  p_cost_id uuid, p_action text, p_effective_on date, p_actual_amount_minor bigint default null
) returns void language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if not public.is_admin(auth.uid()) then raise exception 'Access denied: Admin role required' using errcode = '42501'; end if;
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

create or replace function public.create_cash_balance_snapshot(
  p_balance_minor bigint, p_currency text, p_confirmed_at timestamptz,
  p_confirmed_by_member_id uuid, p_description text
) returns uuid language plpgsql security definer set search_path = public, pg_temp as $$
declare saved_id uuid;
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if not public.is_admin(auth.uid()) then raise exception 'Access denied: Admin role required' using errcode = '42501'; end if;
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

-- 7. Define admin actions to manage other users' roles
create or replace function public.update_member_role(p_member_id uuid, p_role text)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'Access denied: Admin role required' using errcode = '42501';
  end if;

  if p_role not in ('admin', 'engineer') then
    raise exception 'Invalid role' using errcode = '23514';
  end if;

  update public.members
  set role = p_role,
      updated_at = now()
  where id = p_member_id;

  if not found then
    raise exception 'Member not found' using errcode = 'P0002';
  end if;
end;
$$;

-- 8. Define admin actions to toggle active state of users
create or replace function public.toggle_member_active(p_member_id uuid, p_is_active boolean)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'Access denied: Admin role required' using errcode = '42501';
  end if;

  if p_member_id = auth.uid() then
    raise exception 'Cannot deactivate yourself' using errcode = '23514';
  end if;

  update public.members
  set is_active = p_is_active,
      updated_at = now()
  where id = p_member_id;

  if not found then
    raise exception 'Member not found' using errcode = 'P0002';
  end if;
end;
$$;

-- 9. Grant execute permissions to authenticated users for the new functions
revoke all on function public.update_member_role(uuid, text) from public, anon;
grant execute on function public.update_member_role(uuid, text) to authenticated;

revoke all on function public.toggle_member_active(uuid, boolean) from public, anon;
grant execute on function public.toggle_member_active(uuid, boolean) to authenticated;

commit;
