begin;

alter table public.meetings
  drop constraint meetings_kind_check;

alter table public.meetings
  add constraint meetings_kind_check
    check (kind in ('meeting', 'event', 'vacation')),
  add column calendar_tone text,
  add constraint meetings_calendar_tone_check check (
    (kind = 'vacation' and calendar_tone in (
      'orange', 'blue', 'green', 'purple', 'pink', 'red'
    ))
    or
    (kind in ('meeting', 'event') and calendar_tone is null)
  );

create or replace function public.save_meeting(
  p_meeting_id uuid,
  p_values jsonb,
  p_participants jsonb,
  p_company_ids uuid[],
  p_task_ids uuid[]
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  saved_meeting_id uuid;
  selected_kind text :=
    coalesce(nullif(btrim(p_values->>'kind'), ''), 'meeting');
  selected_tone text :=
    nullif(btrim(p_values->>'calendar_tone'), '');
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  if selected_kind not in ('meeting', 'event', 'vacation') then
    raise exception 'Invalid calendar object kind' using errcode = '23514';
  end if;

  if selected_kind = 'meeting'
    and jsonb_array_length(coalesce(p_participants, '[]'::jsonb)) = 0 then
    raise exception 'A Meeting requires an internal participant' using errcode = '23514';
  end if;

  if selected_kind = 'vacation' then
    if jsonb_array_length(coalesce(p_participants, '[]'::jsonb)) <> 1 then
      raise exception 'A Vacation requires exactly one internal participant'
        using errcode = '23514';
    end if;
    if selected_tone is null or selected_tone not in (
      'orange', 'blue', 'green', 'purple', 'pink', 'red'
    ) then
      raise exception 'A Vacation requires a valid calendar tone'
        using errcode = '23514';
    end if;
    if cardinality(coalesce(p_company_ids, '{}'::uuid[])) <> 0
      or cardinality(coalesce(p_task_ids, '{}'::uuid[])) <> 0 then
      raise exception 'A Vacation cannot carry operational relations'
        using errcode = '23514';
    end if;
  else
    selected_tone := null;
  end if;

  if p_meeting_id is null then
    insert into public.meetings (
      kind,
      calendar_tone,
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
      selected_kind,
      selected_tone,
      btrim(p_values->>'title'),
      null,
      null,
      null,
      (p_values->>'starts_at')::timestamptz,
      (p_values->>'ends_at')::timestamptz,
      null,
      case
        when selected_kind = 'vacation' then null
        else nullif(btrim(p_values->>'notes'), '')
      end,
      null
    )
    returning id into saved_meeting_id;
  else
    update public.meetings
    set
      kind = selected_kind,
      calendar_tone = selected_tone,
      title = btrim(p_values->>'title'),
      purpose = null,
      intended_result = null,
      closer_member_id = null,
      starts_at = (p_values->>'starts_at')::timestamptz,
      ends_at = (p_values->>'ends_at')::timestamptz,
      agenda = null,
      notes = case
        when selected_kind = 'vacation' then null
        else nullif(btrim(p_values->>'notes'), '')
      end,
      open_questions = null
    where id = p_meeting_id
      and status in ('planned', 'needs_closure')
    returning id into saved_meeting_id;

    if saved_meeting_id is null then
      raise exception 'Meeting not found or no longer editable' using errcode = 'P0002';
    end if;

    delete from public.meeting_participants
    where meeting_id = saved_meeting_id;
    delete from public.meeting_companies
    where meeting_id = saved_meeting_id;
    delete from public.task_meetings
    where meeting_id = saved_meeting_id;
  end if;

  insert into public.meeting_participants (
    meeting_id,
    member_id,
    contact_id,
    external_name
  )
  select
    saved_meeting_id,
    (participant->>'member_id')::uuid,
    null,
    null
  from jsonb_array_elements(coalesce(p_participants, '[]'::jsonb)) participant;

  insert into public.meeting_companies (meeting_id, company_id)
  select saved_meeting_id, id
  from (
    select distinct unnest(coalesce(p_company_ids, '{}'::uuid[])) id
  ) selected;

  insert into public.task_meetings (task_id, meeting_id)
  select id, saved_meeting_id
  from (
    select distinct unnest(coalesce(p_task_ids, '{}'::uuid[])) id
  ) selected;

  insert into public.task_meetings (task_id, meeting_id)
  select id, saved_meeting_id
  from public.tasks
  where origin_type = 'meeting'
    and origin_meeting_id = saved_meeting_id
  on conflict do nothing;

  return saved_meeting_id;
end;
$$;

commit;
