begin;

create table public.members (
  id uuid primary key references auth.users (id) on delete restrict,
  display_name text not null check (char_length(btrim(display_name)) between 1 and 120),
  email text not null check (char_length(btrim(email)) between 3 and 320),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index members_email_lower_key on public.members (lower(email));

create function public.sync_auth_user_to_member()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  member_email text;
  member_name text;
begin
  member_email := coalesce(new.email, new.id::text || '@auth.local');
  member_name := coalesce(
    nullif(btrim(new.raw_user_meta_data ->> 'full_name'), ''),
    nullif(btrim(new.raw_user_meta_data ->> 'name'), ''),
    split_part(member_email, '@', 1)
  );

  insert into public.members (id, display_name, email)
  values (new.id, member_name, member_email)
  on conflict (id) do update
    set display_name = excluded.display_name,
        email = excluded.email,
        updated_at = now();

  return new;
end;
$$;

create trigger sync_auth_user_to_member_after_insert
after insert or update of email, raw_user_meta_data on auth.users
for each row execute function public.sync_auth_user_to_member();

insert into public.members (id, display_name, email)
select
  users.id,
  coalesce(
    nullif(btrim(users.raw_user_meta_data ->> 'full_name'), ''),
    nullif(btrim(users.raw_user_meta_data ->> 'name'), ''),
    split_part(coalesce(users.email, users.id::text || '@auth.local'), '@', 1)
  ),
  coalesce(users.email, users.id::text || '@auth.local')
from auth.users as users
on conflict (id) do nothing;

create table public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  status text not null default 'active',
  owner_member_id uuid not null,
  current_context text,
  relationship_risks text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint companies_owner_member_id_fkey
    foreign key (owner_member_id) references public.members (id) on delete restrict,
  constraint companies_name_length_check
    check (char_length(btrim(name)) between 1 and 160),
  constraint companies_name_not_vouga_check
    check (
      lower(regexp_replace(btrim(name), '[^[:alnum:]]+', ' ', 'g'))
      not in ('vouga', 'a vouga', 'vouga agency', 'vouga lda', 'vouga agency lda')
    ),
  constraint companies_status_check
    check (status in ('active', 'inactive', 'archived')),
  constraint companies_current_context_length_check
    check (current_context is null or char_length(btrim(current_context)) between 1 and 4000),
  constraint companies_relationship_risks_length_check
    check (relationship_risks is null or char_length(btrim(relationship_risks)) between 1 and 4000)
);

create index companies_status_updated_at_idx on public.companies (status, updated_at desc);
create index companies_owner_member_id_idx on public.companies (owner_member_id);

create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger members_set_updated_at
before update on public.members
for each row execute function public.set_updated_at();

create trigger companies_set_updated_at
before update on public.companies
for each row execute function public.set_updated_at();

create function public.require_active_company_owner()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not exists (
    select 1
    from public.members
    where id = new.owner_member_id
      and is_active = true
  ) then
    raise exception 'Company owner must be an active member' using errcode = '23514';
  end if;

  return new;
end;
$$;

create trigger companies_require_active_owner
before insert or update of owner_member_id on public.companies
for each row execute function public.require_active_company_owner();

alter table public.members enable row level security;
alter table public.companies enable row level security;

create policy members_select_authenticated
on public.members
for select
to authenticated
using (auth.uid() is not null);

create policy companies_select_authenticated
on public.companies
for select
to authenticated
using (auth.uid() is not null);

create policy companies_insert_authenticated
on public.companies
for insert
to authenticated
with check (auth.uid() is not null);

create policy companies_update_authenticated
on public.companies
for update
to authenticated
using (auth.uid() is not null)
with check (auth.uid() is not null);

revoke all on table public.members from anon;
revoke all on table public.companies from anon;
revoke insert, update, delete on table public.members from authenticated;

grant select on table public.members to authenticated;
grant select, insert, update on table public.companies to authenticated;

commit;
