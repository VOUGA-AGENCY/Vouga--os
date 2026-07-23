begin;

create table public.google_event_artifacts (
  member_id uuid not null references public.google_connections (member_id) on delete cascade,
  calendar_id text not null,
  google_event_id text not null,
  classification text,
  owner_member_id uuid references public.members (id) on delete restrict,
  purpose text,
  notes text,
  output text,
  output_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (member_id, calendar_id, google_event_id),
  constraint google_event_artifacts_calendar_id_check
    check (char_length(btrim(calendar_id)) between 1 and 1024),
  constraint google_event_artifacts_event_id_check
    check (char_length(btrim(google_event_id)) between 1 and 1024),
  constraint google_event_artifacts_classification_check
    check (classification is null or classification in ('meeting', 'event')),
  constraint google_event_artifacts_purpose_check
    check (purpose is null or char_length(btrim(purpose)) between 1 and 2000),
  constraint google_event_artifacts_notes_check
    check (notes is null or char_length(btrim(notes)) between 1 and 12000),
  constraint google_event_artifacts_output_check
    check (
      (output is null and output_at is null)
      or (
        classification = 'meeting'
        and char_length(btrim(output)) between 1 and 4000
        and output_at is not null
      )
    )
);

create trigger google_event_artifacts_set_updated_at
before update on public.google_event_artifacts
for each row execute function public.set_updated_at();

create table public.google_event_artifact_companies (
  member_id uuid not null,
  calendar_id text not null,
  google_event_id text not null,
  company_id uuid not null references public.companies (id) on delete restrict,
  primary key (member_id, calendar_id, google_event_id, company_id),
  foreign key (member_id, calendar_id, google_event_id)
    references public.google_event_artifacts (member_id, calendar_id, google_event_id)
    on delete cascade
);

create table public.google_event_artifact_contacts (
  member_id uuid not null,
  calendar_id text not null,
  google_event_id text not null,
  contact_id uuid not null references public.contacts (id) on delete restrict,
  primary key (member_id, calendar_id, google_event_id, contact_id),
  foreign key (member_id, calendar_id, google_event_id)
    references public.google_event_artifacts (member_id, calendar_id, google_event_id)
    on delete cascade
);

alter table public.google_event_artifacts enable row level security;
alter table public.google_event_artifact_companies enable row level security;
alter table public.google_event_artifact_contacts enable row level security;

create policy google_event_artifacts_select_own
on public.google_event_artifacts for select to authenticated
using (member_id = auth.uid());
create policy google_event_artifact_companies_select_own
on public.google_event_artifact_companies for select to authenticated
using (member_id = auth.uid());
create policy google_event_artifact_contacts_select_own
on public.google_event_artifact_contacts for select to authenticated
using (member_id = auth.uid());

create function public.save_google_event_artifact(
  p_member_id uuid,
  p_calendar_id text,
  p_google_event_id text,
  p_values jsonb,
  p_company_ids uuid[],
  p_contact_ids uuid[]
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null or p_member_id <> auth.uid() then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if not exists (
    select 1 from public.google_calendar_selections
    where member_id = auth.uid() and calendar_id = p_calendar_id
  ) then
    raise exception 'Selected Google calendar required' using errcode = '23514';
  end if;

  insert into public.google_event_artifacts (
    member_id, calendar_id, google_event_id, classification, owner_member_id,
    purpose, notes, output, output_at
  ) values (
    auth.uid(), btrim(p_calendar_id), btrim(p_google_event_id),
    nullif(btrim(p_values->>'classification'), ''),
    nullif(p_values->>'owner_member_id', '')::uuid,
    nullif(btrim(p_values->>'purpose'), ''),
    nullif(btrim(p_values->>'notes'), ''),
    nullif(btrim(p_values->>'output'), ''),
    nullif(p_values->>'output_at', '')::timestamptz
  )
  on conflict (member_id, calendar_id, google_event_id) do update set
    classification = excluded.classification,
    owner_member_id = excluded.owner_member_id,
    purpose = excluded.purpose,
    notes = excluded.notes,
    output = excluded.output,
    output_at = excluded.output_at;

  delete from public.google_event_artifact_companies
  where member_id = auth.uid() and calendar_id = p_calendar_id and google_event_id = p_google_event_id;
  insert into public.google_event_artifact_companies
    (member_id, calendar_id, google_event_id, company_id)
  select auth.uid(), btrim(p_calendar_id), btrim(p_google_event_id), company_id
  from (select distinct unnest(coalesce(p_company_ids, '{}'::uuid[])) company_id) selected;

  delete from public.google_event_artifact_contacts
  where member_id = auth.uid() and calendar_id = p_calendar_id and google_event_id = p_google_event_id;
  insert into public.google_event_artifact_contacts
    (member_id, calendar_id, google_event_id, contact_id)
  select auth.uid(), btrim(p_calendar_id), btrim(p_google_event_id), contact_id
  from (select distinct unnest(coalesce(p_contact_ids, '{}'::uuid[])) contact_id) selected;
end;
$$;

revoke all on public.google_event_artifacts,
  public.google_event_artifact_companies,
  public.google_event_artifact_contacts from anon, authenticated;
grant select on public.google_event_artifacts,
  public.google_event_artifact_companies,
  public.google_event_artifact_contacts to authenticated;
revoke all on function public.save_google_event_artifact(uuid, text, text, jsonb, uuid[], uuid[]) from public;
grant execute on function public.save_google_event_artifact(uuid, text, text, jsonb, uuid[], uuid[]) to authenticated;

commit;
