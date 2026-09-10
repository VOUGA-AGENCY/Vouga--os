begin;

alter table public.companies
  drop constraint if exists companies_prospecting_stage_check;

alter table public.companies
  add constraint companies_prospecting_stage_check check (
    prospecting_stage is null or prospecting_stage in (
      'to_contact',
      'contacted',
      'strategic_partnership',
      'budgeting',
      'agreed',
      'replied',
      'meeting_scheduled',
      'not_interested'
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

  if not exists (
    select 1
    from public.companies
    where id = p_company_id
      and status <> 'archived'
  ) then
    raise exception 'Organisation unavailable' using errcode = 'P0002';
  end if;

  if p_channel is null or p_channel not in ('email', 'linkedin', 'call') then
    raise exception 'Invalid channel' using errcode = '23514';
  end if;

  if p_stage is null or p_stage not in (
    'to_contact',
    'contacted',
    'strategic_partnership',
    'budgeting',
    'agreed',
    'replied',
    'meeting_scheduled',
    'not_interested'
  ) then
    raise exception 'Invalid relationship stage' using errcode = '23514';
  end if;

  if p_body is null or char_length(btrim(p_body)) not between 1 and 12000 then
    raise exception 'Interaction message required' using errcode = '23514';
  end if;

  if p_contact_id is not null and not exists (
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
    company_id,
    contact_id,
    direction,
    channel,
    body,
    occurred_at,
    source_template_id,
    recorded_by_member_id
  ) values (
    p_company_id,
    p_contact_id,
    'outbound',
    p_channel,
    btrim(p_body),
    now(),
    p_source_template_id,
    auth.uid()
  )
  returning id into created_interaction_id;

  if p_contact_id is null then
    update public.companies
    set prospecting_stage = p_stage
    where id = p_company_id
      and status <> 'archived';
  else
    update public.companies
    set
      primary_contact_id = p_contact_id,
      prospecting_stage = p_stage
    where id = p_company_id
      and status <> 'archived';
  end if;

  if not found then
    raise exception 'Organisation unavailable' using errcode = 'P0002';
  end if;

  return created_interaction_id;
end;
$$;

commit;
