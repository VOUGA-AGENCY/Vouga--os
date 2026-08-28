begin;

alter table public.contact_interactions
  add column company_id uuid;

alter table public.contact_interactions
  add constraint contact_interactions_company_id_fkey
  foreign key (company_id)
  references public.companies (id)
  on delete restrict;

update public.contact_interactions as interaction
set company_id = contact.company_id
from public.contacts as contact
where contact.id = interaction.contact_id
  and contact.company_id is not null;

do $$
declare
  unresolved_count bigint;
begin
  select count(*)
  into unresolved_count
  from public.contact_interactions
  where company_id is null;

  if unresolved_count > 0 then
    raise exception 'Contact Interaction backfill requires an Organisation for every record'
      using
        errcode = '23514',
        detail = unresolved_count::text || ' Contact Interactions remain without an Organisation';
  end if;
end;
$$;

alter table public.contact_interactions
  alter column company_id set not null,
  alter column contact_id drop not null;

alter table public.contact_interactions
  drop constraint contact_interactions_contact_id_fkey,
  add constraint contact_interactions_contact_id_fkey
  foreign key (contact_id)
  references public.contacts (id)
  on delete set null;

create index contact_interactions_company_occurred_idx
  on public.contact_interactions (company_id, occurred_at desc);

create or replace function public.validate_contact_interaction()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  parent_company uuid;
  parent_time timestamptz;
  template_channel text;
begin
  if not exists (
    select 1
    from public.companies
    where id = new.company_id
      and status <> 'archived'
  ) then
    raise exception 'Interaction Organisation must be available' using errcode = '23514';
  end if;

  if new.contact_id is not null and not exists (
    select 1
    from public.contacts
    where id = new.contact_id
      and company_id = new.company_id
      and status = 'active'
  ) then
    raise exception 'Interaction Profile must be active and belong to the Organisation'
      using errcode = '23514';
  end if;

  if new.reply_to_interaction_id is not null then
    select company_id, occurred_at
    into parent_company, parent_time
    from public.contact_interactions
    where id = new.reply_to_interaction_id;

    if parent_company is null
      or parent_company <> new.company_id
      or parent_time > new.occurred_at
    then
      raise exception 'Reply must reference an earlier Interaction for the same Organisation'
        using errcode = '23514';
    end if;
  end if;

  if new.source_template_id is not null then
    select channel
    into template_channel
    from public.contact_message_templates
    where id = new.source_template_id;

    if new.direction <> 'outbound'
      or template_channel is null
      or template_channel <> new.channel
    then
      raise exception 'Template must match an outbound Interaction channel'
        using errcode = '23514';
    end if;
  end if;

  return new;
end;
$$;

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
    'replied',
    'meeting_scheduled',
    'not_interested',
    'agreed'
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

revoke all on function public.record_contact_interaction(uuid, uuid, text, text, uuid, text)
  from public, anon;
grant execute on function public.record_contact_interaction(uuid, uuid, text, text, uuid, text)
  to authenticated;

create or replace function public.record_prospecting_touch(
  p_company_id uuid,
  p_contact_id uuid,
  p_channel text,
  p_note text,
  p_next_step text,
  p_follow_up_at timestamptz
) returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  created_task_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  if p_channel is null or p_channel not in ('email', 'linkedin', 'call') then
    raise exception 'Invalid channel' using errcode = '23514';
  end if;

  if not exists (
    select 1
    from public.contacts
    where id = p_contact_id
      and company_id = p_company_id
      and status = 'active'
  ) then
    raise exception 'Contact must belong to the Organisation' using errcode = '23514';
  end if;

  if p_note is null or char_length(btrim(p_note)) not between 1 and 12000 then
    raise exception 'Interaction note required' using errcode = '23514';
  end if;

  insert into public.contact_interactions (
    company_id,
    contact_id,
    direction,
    channel,
    body,
    occurred_at,
    recorded_by_member_id
  ) values (
    p_company_id,
    p_contact_id,
    'outbound',
    p_channel,
    btrim(p_note),
    now(),
    auth.uid()
  );

  update public.companies
  set
    primary_contact_id = coalesce(primary_contact_id, p_contact_id),
    prospecting_stage = case
      when prospecting_stage = 'not_interested' then prospecting_stage
      else 'contacted'
    end
  where id = p_company_id
    and status <> 'archived';

  if not found then
    raise exception 'Organisation unavailable' using errcode = 'P0002';
  end if;

  if nullif(btrim(coalesce(p_next_step, '')), '') is not null then
    if p_follow_up_at is null then
      raise exception 'Follow-up date required' using errcode = '23514';
    end if;

    insert into public.tasks (
      title,
      expected_result,
      status,
      owner_member_id,
      due_at,
      origin_type,
      purpose
    ) values (
      btrim(p_next_step),
      null,
      'todo',
      auth.uid(),
      p_follow_up_at,
      'planning',
      'relationship_follow_up'
    )
    returning id into created_task_id;

    insert into public.task_companies (task_id, company_id)
    values (created_task_id, p_company_id);
  end if;
end;
$$;

revoke all on function public.record_prospecting_touch(uuid, uuid, text, text, text, timestamptz)
  from public, anon;
grant execute on function public.record_prospecting_touch(uuid, uuid, text, text, text, timestamptz)
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

  if not exists (
    select 1
    from public.contacts
    where id = p_contact_id
  ) then
    raise exception 'Profile not found' using errcode = 'P0002';
  end if;

  update public.companies
  set primary_contact_id = null
  where primary_contact_id = p_contact_id;

  update public.meeting_participants
  set contact_id = null
  where contact_id = p_contact_id
    and external_name is not null;

  delete from public.google_event_artifact_contacts
  where contact_id = p_contact_id;

  delete from public.project_contacts
  where contact_id = p_contact_id;

  update public.contact_interactions
  set contact_id = null
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

  if not exists (
    select 1
    from public.companies
    where id = p_company_id
  ) then
    raise exception 'Organisation not found' using errcode = 'P0002';
  end if;

  if exists (
    select 1
    from public.contacts
    where company_id = p_company_id
  ) then
    raise exception 'Remove or reassign the Organisation profiles first' using errcode = '23503';
  end if;

  if exists (select 1 from public.meeting_companies where company_id = p_company_id)
    or exists (select 1 from public.task_companies where company_id = p_company_id)
    or exists (select 1 from public.decision_companies where company_id = p_company_id)
    or exists (select 1 from public.roadmap_item_companies where company_id = p_company_id)
    or exists (select 1 from public.costs where company_id = p_company_id)
    or exists (
      select 1
      from public.google_event_artifact_companies
      where company_id = p_company_id
    )
    or exists (
      select 1
      from public.contact_interactions
      where company_id = p_company_id
    )
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
