-- Vault metadata and encrypted payload only; plaintext never reaches Postgres.
begin;

create table public.vault_entries (
  id uuid primary key default gen_random_uuid(),
  service_name text not null,
  url text,
  encrypted_payload jsonb not null,
  key_version integer not null,
  created_by_member_id uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint vault_entries_created_by_member_id_fkey
    foreign key (created_by_member_id) references public.members (id) on delete restrict,
  constraint vault_entries_service_name_length_check
    check (char_length(btrim(service_name)) between 1 and 120),
  constraint vault_entries_url_length_check
    check (url is null or char_length(url) between 1 and 2048),
  constraint vault_entries_key_version_check
    check (key_version > 0),
  constraint vault_entries_encrypted_payload_check
    check (
      jsonb_typeof(encrypted_payload) = 'object'
      and encrypted_payload ? 'ciphertext'
      and encrypted_payload ? 'iv'
      and jsonb_typeof(encrypted_payload->'ciphertext') = 'string'
      and jsonb_typeof(encrypted_payload->'iv') = 'string'
      and char_length(encrypted_payload->>'ciphertext') between 1 and 16384
      and char_length(encrypted_payload->>'iv') between 1 and 128
    )
);

create index vault_entries_updated_at_idx
  on public.vault_entries (updated_at desc);

create trigger vault_entries_set_updated_at
before update on public.vault_entries
for each row execute function public.set_updated_at();

alter table public.vault_entries enable row level security;

revoke all on table public.vault_entries from public, anon, authenticated;

create function public.list_vault_entries()
returns table (
  id uuid,
  service_name text,
  url text,
  key_version integer,
  created_by_member_id uuid,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = public, pg_temp
stable
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  return query
  select
    entry.id,
    entry.service_name,
    entry.url,
    entry.key_version,
    entry.created_by_member_id,
    entry.created_at,
    entry.updated_at
  from public.vault_entries entry
  order by lower(entry.service_name), entry.updated_at desc;
end;
$$;

create function public.get_vault_entry_ciphertext(p_vault_entry_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
stable
as $$
declare
  result jsonb;
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  select jsonb_build_object(
    'id', entry.id,
    'service_name', entry.service_name,
    'url', entry.url,
    'encrypted_payload', entry.encrypted_payload,
    'key_version', entry.key_version,
    'created_by_member_id', entry.created_by_member_id,
    'created_at', entry.created_at,
    'updated_at', entry.updated_at
  )
  into result
  from public.vault_entries entry
  where entry.id = p_vault_entry_id;

  return result;
end;
$$;

create function public.create_vault_entry(
  p_service_name text,
  p_url text,
  p_encrypted_payload jsonb,
  p_key_version integer
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  saved_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  insert into public.vault_entries (
    service_name,
    url,
    encrypted_payload,
    key_version,
    created_by_member_id
  )
  values (
    btrim(p_service_name),
    nullif(btrim(p_url), ''),
    p_encrypted_payload,
    p_key_version,
    auth.uid()
  )
  returning id into saved_id;

  return saved_id;
end;
$$;

create function public.delete_vault_entry(p_vault_entry_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  delete from public.vault_entries where id = p_vault_entry_id;
  if not found then
    raise exception 'Vault entry not found' using errcode = 'P0002';
  end if;
end;
$$;

revoke all on function public.list_vault_entries() from public, anon;
revoke all on function public.get_vault_entry_ciphertext(uuid) from public, anon;
revoke all on function public.create_vault_entry(text,text,jsonb,integer) from public, anon;
revoke all on function public.delete_vault_entry(uuid) from public, anon;

grant execute on function public.list_vault_entries() to authenticated;
grant execute on function public.get_vault_entry_ciphertext(uuid) to authenticated;
grant execute on function public.create_vault_entry(text,text,jsonb,integer) to authenticated;
grant execute on function public.delete_vault_entry(uuid) to authenticated;

commit;
