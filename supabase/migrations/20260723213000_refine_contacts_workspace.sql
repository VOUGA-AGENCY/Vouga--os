begin;

alter table public.companies
  drop constraint companies_prospecting_stage_check;

alter table public.companies
  add constraint companies_prospecting_stage_check check (
    prospecting_stage is null or prospecting_stage in (
      'to_contact',
      'contacted',
      'replied',
      'meeting_scheduled',
      'not_interested',
      'agreed'
    )
  );

create or replace function public.record_contact_interaction(
  p_company_id uuid,
  p_contact_id uuid,
  p_channel text,
  p_body text,
  p_source_template_id uuid,
  p_stage text
) returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  created_interaction_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  if p_channel not in ('email', 'linkedin', 'call') then
    raise exception 'Invalid channel' using errcode = '23514';
  end if;

  if p_stage not in (
    'to_contact',
    'contacted',
    'replied',
    'meeting_scheduled',
    'not_interested',
    'agreed'
  ) then
    raise exception 'Invalid relationship stage' using errcode = '23514';
  end if;

  if char_length(btrim(p_body)) not between 1 and 12000 then
    raise exception 'Interaction message required' using errcode = '23514';
  end if;

  if not exists (
    select 1
    from public.contacts
    where id = p_contact_id
      and company_id = p_company_id
      and status = 'active'
  ) then
    raise exception 'Profile must belong to the Organisation' using errcode = '23514';
  end if;

  if p_source_template_id is not null and not exists (
    select 1
    from public.contact_message_templates
    where id = p_source_template_id
      and channel = p_channel
      and status = 'active'
  ) then
    raise exception 'Script must be active and match the channel' using errcode = '23514';
  end if;

  insert into public.contact_interactions (
    contact_id,
    direction,
    channel,
    body,
    occurred_at,
    source_template_id,
    recorded_by_member_id
  ) values (
    p_contact_id,
    'outbound',
    p_channel,
    btrim(p_body),
    now(),
    p_source_template_id,
    auth.uid()
  )
  returning id into created_interaction_id;

  update public.companies
  set
    primary_contact_id = p_contact_id,
    prospecting_stage = p_stage
  where id = p_company_id
    and status <> 'archived';

  if not found then
    raise exception 'Organisation unavailable' using errcode = 'P0002';
  end if;

  return created_interaction_id;
end;
$$;

revoke all on function public.record_contact_interaction(uuid, uuid, text, text, uuid, text)
  from public, anon;
grant execute on function public.record_contact_interaction(uuid, uuid, text, text, uuid, text)
  to authenticated;

create or replace function public.delete_contact_profile(p_contact_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  if not exists (select 1 from public.contacts where id = p_contact_id) then
    raise exception 'Profile not found' using errcode = 'P0002';
  end if;

  update public.companies
  set primary_contact_id = null
  where primary_contact_id = p_contact_id;

  update public.meeting_participants
  set contact_id = null
  where contact_id = p_contact_id
    and external_name is not null;

  delete from public.google_event_contacts
  where contact_id = p_contact_id;

  update public.contact_interactions
  set reply_to_interaction_id = null
  where contact_id = p_contact_id;

  delete from public.contact_interactions
  where contact_id = p_contact_id;

  delete from public.contacts
  where id = p_contact_id;
end;
$$;

revoke all on function public.delete_contact_profile(uuid) from public, anon;
grant execute on function public.delete_contact_profile(uuid) to authenticated;

create or replace function public.delete_company_if_unreferenced(p_company_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  if not exists (select 1 from public.companies where id = p_company_id) then
    raise exception 'Organisation not found' using errcode = 'P0002';
  end if;

  if exists (select 1 from public.contacts where company_id = p_company_id) then
    raise exception 'Remove or reassign the Organisation profiles first' using errcode = '23503';
  end if;

  if exists (select 1 from public.meeting_companies where company_id = p_company_id)
    or exists (select 1 from public.task_companies where company_id = p_company_id)
    or exists (select 1 from public.decision_companies where company_id = p_company_id)
    or exists (select 1 from public.roadmap_item_companies where company_id = p_company_id)
    or exists (select 1 from public.costs where company_id = p_company_id)
    or exists (select 1 from public.google_event_companies where company_id = p_company_id)
  then
    raise exception 'Organisation has protected operational context' using errcode = '23503';
  end if;

  delete from public.companies
  where id = p_company_id;
end;
$$;

revoke all on function public.delete_company_if_unreferenced(uuid) from public, anon;
grant execute on function public.delete_company_if_unreferenced(uuid) to authenticated;

commit;
