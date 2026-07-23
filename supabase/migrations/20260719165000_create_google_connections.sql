begin;

create table public.google_connections (
  member_id uuid primary key references public.members (id) on delete restrict,
  provider_subject text not null,
  email text not null,
  scopes text[] not null,
  status text not null default 'active',
  refresh_token_ciphertext text,
  refresh_token_iv text,
  token_key_version smallint not null default 1,
  connected_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  revoked_at timestamptz,
  constraint google_connections_subject_check
    check (char_length(btrim(provider_subject)) between 1 and 255),
  constraint google_connections_email_check
    check (char_length(btrim(email)) between 3 and 320),
  constraint google_connections_scopes_check
    check (cardinality(scopes) > 0),
  constraint google_connections_status_check
    check (status in ('active', 'revoked')),
  constraint google_connections_key_version_check
    check (token_key_version > 0),
  constraint google_connections_credential_state_check
    check (
      (status = 'active' and refresh_token_ciphertext is not null and refresh_token_iv is not null and revoked_at is null)
      or
      (status = 'revoked' and refresh_token_ciphertext is null and refresh_token_iv is null and revoked_at is not null)
    )
);

create index google_connections_email_idx on public.google_connections (lower(email));
create trigger google_connections_set_updated_at
before update on public.google_connections
for each row execute function public.set_updated_at();

alter table public.google_connections enable row level security;

create policy google_connections_select_own
on public.google_connections
for select
to authenticated
using (member_id = auth.uid());

create policy google_connections_insert_own
on public.google_connections
for insert
to authenticated
with check (member_id = auth.uid());

create policy google_connections_update_own
on public.google_connections
for update
to authenticated
using (member_id = auth.uid())
with check (member_id = auth.uid());

revoke all on table public.google_connections from anon;
grant select, insert, update on table public.google_connections to authenticated;

commit;
