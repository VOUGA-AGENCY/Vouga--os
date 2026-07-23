begin;

alter table public.meetings
  add column kind text not null default 'meeting';

alter table public.meetings
  add constraint meetings_kind_check
  check (kind in ('meeting', 'event'));

create or replace function public.save_meeting(
  p_meeting_id uuid,
  p_values jsonb,
  p_participants jsonb,
  p_company_ids uuid[]
)
returns uuid
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  saved_meeting_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  if p_meeting_id is null then
    insert into public.meetings (
      kind,
      title,
      purpose,
      intended_result,
      closer_member_id,
      starts_at,
      ends_at,
      agenda,
      notes,
      open_questions
    ) values (
      coalesce(nullif(btrim(p_values ->> 'kind'), ''), 'meeting'),
      btrim(p_values ->> 'title'),
      btrim(p_values ->> 'purpose'),
      nullif(btrim(p_values ->> 'intended_result'), ''),
      (p_values ->> 'closer_member_id')::uuid,
      (p_values ->> 'starts_at')::timestamptz,
      (p_values ->> 'ends_at')::timestamptz,
      nullif(btrim(p_values ->> 'agenda'), ''),
      nullif(btrim(p_values ->> 'notes'), ''),
      nullif(btrim(p_values ->> 'open_questions'), '')
    )
    returning id into saved_meeting_id;
  else
    update public.meetings set
      kind = coalesce(nullif(btrim(p_values ->> 'kind'), ''), 'meeting'),
      title = btrim(p_values ->> 'title'),
      purpose = btrim(p_values ->> 'purpose'),
      intended_result = nullif(btrim(p_values ->> 'intended_result'), ''),
      closer_member_id = (p_values ->> 'closer_member_id')::uuid,
      starts_at = (p_values ->> 'starts_at')::timestamptz,
      ends_at = (p_values ->> 'ends_at')::timestamptz,
      agenda = nullif(btrim(p_values ->> 'agenda'), ''),
      notes = nullif(btrim(p_values ->> 'notes'), ''),
      open_questions = nullif(btrim(p_values ->> 'open_questions'), '')
    where id = p_meeting_id and status in ('planned', 'needs_closure')
    returning id into saved_meeting_id;

    if saved_meeting_id is null then
      raise exception 'Meeting not found or no longer editable' using errcode = 'P0002';
    end if;

    delete from public.meeting_participants where meeting_id = saved_meeting_id;
    delete from public.meeting_companies where meeting_id = saved_meeting_id;
  end if;

  insert into public.meeting_participants (meeting_id, member_id, contact_id, external_name)
  select
    saved_meeting_id,
    nullif(participant ->> 'member_id', '')::uuid,
    nullif(participant ->> 'contact_id', '')::uuid,
    case
      when nullif(participant ->> 'contact_id', '') is not null then (
        select display_name from public.contacts where id = (participant ->> 'contact_id')::uuid
      )
      else nullif(btrim(participant ->> 'external_name'), '')
    end
  from jsonb_array_elements(coalesce(p_participants, '[]'::jsonb)) as participant;

  insert into public.meeting_companies (meeting_id, company_id)
  select saved_meeting_id, company_id
  from unnest(coalesce(p_company_ids, '{}'::uuid[])) as company_id;

  return saved_meeting_id;
end;
$$;

commit;
