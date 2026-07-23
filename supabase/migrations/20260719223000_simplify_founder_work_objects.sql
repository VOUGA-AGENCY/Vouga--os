begin;

-- Founder forms stop writing the legacy explanatory fields. Existing values remain readable.
alter table public.meetings alter column purpose drop not null;
alter table public.meetings alter column closer_member_id drop not null;
alter table public.tasks alter column expected_result drop not null;

alter table public.tasks
  add column origin_google_member_id uuid,
  add column origin_google_calendar_id text,
  add column origin_google_event_id text;

alter table public.tasks
  add constraint tasks_origin_google_event_fkey
  foreign key (origin_google_member_id, origin_google_calendar_id, origin_google_event_id)
  references public.google_event_artifacts (member_id, calendar_id, google_event_id)
  on delete restrict;

alter table public.tasks drop constraint tasks_origin_check;
alter table public.tasks add constraint tasks_origin_check check (
  (origin_type = 'planning' and origin_meeting_id is null and origin_decision_id is null
    and direct_origin_reason is null and origin_google_member_id is null
    and origin_google_calendar_id is null and origin_google_event_id is null)
  or (origin_type = 'meeting' and origin_meeting_id is not null and origin_decision_id is null
    and direct_origin_reason is null and origin_google_member_id is null
    and origin_google_calendar_id is null and origin_google_event_id is null)
  or (origin_type = 'google_event' and origin_meeting_id is null and origin_decision_id is null
    and direct_origin_reason is null and origin_google_member_id is not null
    and origin_google_calendar_id is not null and origin_google_event_id is not null)
  or (origin_type = 'decision' and origin_meeting_id is null and origin_decision_id is not null
    and direct_origin_reason is null and origin_google_member_id is null
    and origin_google_calendar_id is null and origin_google_event_id is null)
  or (origin_type = 'direct' and origin_meeting_id is null and origin_decision_id is null
    and char_length(btrim(direct_origin_reason)) between 1 and 1000
    and origin_google_member_id is null and origin_google_calendar_id is null
    and origin_google_event_id is null)
);

create index tasks_origin_google_event_idx
  on public.tasks (origin_google_member_id, origin_google_calendar_id, origin_google_event_id)
  where origin_type = 'google_event';

create table public.google_event_artifact_participants (
  member_id uuid not null, calendar_id text not null, google_event_id text not null,
  participant_member_id uuid not null references public.members(id) on delete restrict,
  primary key(member_id,calendar_id,google_event_id,participant_member_id),
  foreign key(member_id,calendar_id,google_event_id)
    references public.google_event_artifacts(member_id,calendar_id,google_event_id) on delete cascade
);
create table public.google_event_artifact_tasks (
  member_id uuid not null, calendar_id text not null, google_event_id text not null,
  task_id uuid not null references public.tasks(id) on delete restrict,
  primary key(member_id,calendar_id,google_event_id,task_id),
  foreign key(member_id,calendar_id,google_event_id)
    references public.google_event_artifacts(member_id,calendar_id,google_event_id) on delete cascade
);
alter table public.google_event_artifact_participants enable row level security;
alter table public.google_event_artifact_tasks enable row level security;
create policy google_event_artifact_participants_select_own on public.google_event_artifact_participants
for select to authenticated using(member_id=auth.uid());
create policy google_event_artifact_tasks_select_own on public.google_event_artifact_tasks
for select to authenticated using(member_id=auth.uid());
revoke all on public.google_event_artifact_participants,public.google_event_artifact_tasks from anon,authenticated;
grant select on public.google_event_artifact_participants,public.google_event_artifact_tasks to authenticated;

drop function public.save_google_event_artifact(uuid,text,text,jsonb,uuid[],uuid[]);
create function public.save_google_event_artifact(
  p_member_id uuid,p_calendar_id text,p_google_event_id text,p_values jsonb,
  p_company_ids uuid[],p_participant_member_ids uuid[],p_task_ids uuid[]
) returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare selected_classification text; selected_output text;
begin
  if auth.uid() is null or auth.uid()<>p_member_id then raise exception 'Authentication required' using errcode='42501'; end if;
  selected_classification:=nullif(btrim(p_values->>'classification'),'');
  selected_output:=nullif(btrim(p_values->>'output'),'');
  if selected_classification='meeting' and coalesce(cardinality(p_participant_member_ids),0)=0 then
    raise exception 'A Meeting requires an internal participant' using errcode='23514';
  end if;
  if selected_output is not null and not auth.uid()=any(coalesce(p_participant_member_ids,'{}'::uuid[])) then
    raise exception 'Only a participant can close this Meeting' using errcode='42501';
  end if;
  insert into public.google_event_artifacts(member_id,calendar_id,google_event_id,classification,owner_member_id,purpose,notes,output,output_at)
  values(auth.uid(),btrim(p_calendar_id),btrim(p_google_event_id),selected_classification,null,null,
    nullif(btrim(p_values->>'notes'),''),selected_output,case when selected_output is null then null else now() end)
  on conflict(member_id,calendar_id,google_event_id) do update set
    classification=excluded.classification,owner_member_id=null,purpose=null,notes=excluded.notes,
    output=excluded.output,output_at=case when excluded.output is null then null else coalesce(google_event_artifacts.output_at,now()) end;
  delete from public.google_event_artifact_companies where member_id=auth.uid() and calendar_id=p_calendar_id and google_event_id=p_google_event_id;
  delete from public.google_event_artifact_contacts where member_id=auth.uid() and calendar_id=p_calendar_id and google_event_id=p_google_event_id;
  delete from public.google_event_artifact_participants where member_id=auth.uid() and calendar_id=p_calendar_id and google_event_id=p_google_event_id;
  delete from public.google_event_artifact_tasks where member_id=auth.uid() and calendar_id=p_calendar_id and google_event_id=p_google_event_id;
  insert into public.google_event_artifact_companies select auth.uid(),p_calendar_id,p_google_event_id,id from(select distinct unnest(coalesce(p_company_ids,'{}'::uuid[]))id)selected;
  insert into public.google_event_artifact_participants select auth.uid(),p_calendar_id,p_google_event_id,id from(select distinct unnest(coalesce(p_participant_member_ids,'{}'::uuid[]))id)selected;
  insert into public.google_event_artifact_tasks select auth.uid(),p_calendar_id,p_google_event_id,id from(select distinct unnest(coalesce(p_task_ids,'{}'::uuid[]))id)selected;
end;
$$;

drop function public.save_meeting(uuid, jsonb, jsonb, uuid[]);
create function public.save_meeting(
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
declare saved_meeting_id uuid;
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if coalesce(nullif(btrim(p_values->>'kind'), ''), 'meeting') = 'meeting'
    and jsonb_array_length(coalesce(p_participants, '[]'::jsonb)) = 0 then
    raise exception 'A Meeting requires an internal participant' using errcode = '23514';
  end if;

  if p_meeting_id is null then
    insert into public.meetings (
      kind, title, purpose, intended_result, closer_member_id, starts_at, ends_at,
      agenda, notes, open_questions
    ) values (
      coalesce(nullif(btrim(p_values->>'kind'), ''), 'meeting'),
      btrim(p_values->>'title'), null, null, null,
      (p_values->>'starts_at')::timestamptz, (p_values->>'ends_at')::timestamptz,
      null, nullif(btrim(p_values->>'notes'), ''), null
    ) returning id into saved_meeting_id;
  else
    update public.meetings set
      kind=coalesce(nullif(btrim(p_values->>'kind'), ''), 'meeting'),
      title=btrim(p_values->>'title'), purpose=null, intended_result=null,
      closer_member_id=null, starts_at=(p_values->>'starts_at')::timestamptz,
      ends_at=(p_values->>'ends_at')::timestamptz, agenda=null,
      notes=nullif(btrim(p_values->>'notes'), ''), open_questions=null
    where id=p_meeting_id and status in ('planned','needs_closure')
    returning id into saved_meeting_id;
    if saved_meeting_id is null then raise exception 'Meeting not found or no longer editable' using errcode='P0002'; end if;
    delete from public.meeting_participants where meeting_id=saved_meeting_id;
    delete from public.meeting_companies where meeting_id=saved_meeting_id;
    delete from public.task_meetings where meeting_id=saved_meeting_id;
  end if;

  insert into public.meeting_participants(meeting_id,member_id,contact_id,external_name)
  select saved_meeting_id,(participant->>'member_id')::uuid,null,null
  from jsonb_array_elements(coalesce(p_participants,'[]'::jsonb)) participant;
  insert into public.meeting_companies(meeting_id,company_id)
  select saved_meeting_id,id from (select distinct unnest(coalesce(p_company_ids,'{}'::uuid[])) id) selected;
  insert into public.task_meetings(task_id,meeting_id)
  select id,saved_meeting_id from (select distinct unnest(coalesce(p_task_ids,'{}'::uuid[])) id) selected;
  insert into public.task_meetings(task_id,meeting_id)
  select id,saved_meeting_id from public.tasks where origin_type='meeting' and origin_meeting_id=saved_meeting_id
  on conflict do nothing;
  return saved_meeting_id;
end;
$$;

drop function public.save_task(uuid,jsonb,uuid[],uuid[]);
create function public.save_task(p_task_id uuid,p_values jsonb,p_company_ids uuid[],p_meeting_ids uuid[])
returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare saved_task_id uuid; selected_origin text; google_member uuid;
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode='42501'; end if;
  if p_task_id is null then
    selected_origin:=coalesce(nullif(p_values->>'origin_type',''),'planning');
    google_member:=nullif(p_values->>'origin_google_member_id','')::uuid;
    if selected_origin='google_event' then
      if google_member<>auth.uid() or not exists (
        select 1 from public.google_calendar_selections
        where member_id=auth.uid() and calendar_id=p_values->>'origin_google_calendar_id'
      ) then raise exception 'Selected Google event required' using errcode='23514'; end if;
      insert into public.google_event_artifacts(member_id,calendar_id,google_event_id)
      values(auth.uid(),btrim(p_values->>'origin_google_calendar_id'),btrim(p_values->>'origin_google_event_id'))
      on conflict do nothing;
    end if;
    insert into public.tasks(
      title,expected_result,owner_member_id,due_at,origin_type,origin_meeting_id,
      origin_decision_id,direct_origin_reason,origin_google_member_id,
      origin_google_calendar_id,origin_google_event_id
    ) values (
      btrim(p_values->>'title'),null,(p_values->>'owner_member_id')::uuid,
      nullif(p_values->>'due_at','')::timestamptz,selected_origin,
      nullif(p_values->>'origin_meeting_id','')::uuid,
      nullif(p_values->>'origin_decision_id','')::uuid,
      nullif(btrim(p_values->>'direct_origin_reason'),''),google_member,
      nullif(btrim(p_values->>'origin_google_calendar_id'),''),
      nullif(btrim(p_values->>'origin_google_event_id'),'')
    ) returning id into saved_task_id;
  else
    update public.tasks set title=btrim(p_values->>'title'),expected_result=null,
      owner_member_id=(p_values->>'owner_member_id')::uuid,
      due_at=nullif(p_values->>'due_at','')::timestamptz
    where id=p_task_id and status not in ('completed','cancelled') returning id into saved_task_id;
    if saved_task_id is null then raise exception 'Task not found or no longer editable' using errcode='P0002'; end if;
    delete from public.task_companies where task_id=saved_task_id;
    delete from public.task_meetings where task_id=saved_task_id;
  end if;
  insert into public.task_companies(task_id,company_id)
  select saved_task_id,id from (select distinct unnest(coalesce(p_company_ids,'{}'::uuid[])) id) selected;
  insert into public.task_meetings(task_id,meeting_id)
  select saved_task_id,id from (select distinct unnest(coalesce(p_meeting_ids,'{}'::uuid[])) id) selected;
  insert into public.task_meetings(task_id,meeting_id)
  select saved_task_id,origin_meeting_id from public.tasks where id=saved_task_id and origin_type='meeting'
  on conflict do nothing;
  insert into public.decision_tasks(decision_id,task_id)
  select origin_decision_id,saved_task_id from public.tasks where id=saved_task_id and origin_type='decision'
  on conflict do nothing;
  insert into public.google_event_artifact_tasks(member_id,calendar_id,google_event_id,task_id)
  select origin_google_member_id,origin_google_calendar_id,origin_google_event_id,saved_task_id
  from public.tasks where id=saved_task_id and origin_type='google_event'
  on conflict do nothing;
  return saved_task_id;
end;
$$;

create function public.close_meeting(p_meeting_id uuid,p_output text)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
begin
  if auth.uid() is null or not exists (
    select 1 from public.meeting_participants
    where meeting_id=p_meeting_id and member_id=auth.uid()
  ) then raise exception 'Only a participant can close this Meeting' using errcode='42501'; end if;
  update public.meetings set status='closed',conclusion=btrim(p_output),closed_at=now()
  where id=p_meeting_id and kind='meeting' and status in ('planned','needs_closure')
    and char_length(btrim(p_output)) between 1 and 4000;
  if not found then raise exception 'Meeting not found or output invalid' using errcode='P0002'; end if;
end;
$$;

create function public.delete_meeting(p_meeting_id uuid)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode='42501'; end if;
  if exists(select 1 from public.tasks where origin_type='meeting' and origin_meeting_id=p_meeting_id)
    or exists(select 1 from public.decision_meetings where meeting_id=p_meeting_id) then
    raise exception 'Meeting has protected history' using errcode='23503';
  end if;
  delete from public.task_meetings where meeting_id=p_meeting_id;
  delete from public.meetings where id=p_meeting_id;
  if not found then raise exception 'Meeting not found' using errcode='P0002'; end if;
end;
$$;

create function public.delete_task(p_task_id uuid)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode='42501'; end if;
  if exists(select 1 from public.decision_tasks where task_id=p_task_id)
    or exists(select 1 from public.sprint_tasks where task_id=p_task_id)
    or exists(select 1 from public.roadmap_item_tasks where task_id=p_task_id)
    or exists(select 1 from public.cost_tasks where task_id=p_task_id) then
    raise exception 'Task has protected context' using errcode='23503';
  end if;
  delete from public.tasks where id=p_task_id;
  if not found then raise exception 'Task not found' using errcode='P0002'; end if;
end;
$$;

create function public.delete_google_event_artifact(p_member_id uuid,p_calendar_id text,p_google_event_id text)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
begin
  if auth.uid() is null or auth.uid()<>p_member_id then raise exception 'Authentication required' using errcode='42501'; end if;
  if exists(select 1 from public.tasks where origin_type='google_event'
    and origin_google_member_id=p_member_id and origin_google_calendar_id=p_calendar_id
    and origin_google_event_id=p_google_event_id) then
    raise exception 'Google event has protected Task history' using errcode='23503';
  end if;
  delete from public.google_event_artifacts where member_id=p_member_id
    and calendar_id=p_calendar_id and google_event_id=p_google_event_id;
end;
$$;

revoke all on function public.save_meeting(uuid,jsonb,jsonb,uuid[],uuid[]) from public;
revoke all on function public.save_task(uuid,jsonb,uuid[],uuid[]) from public;
revoke all on function public.close_meeting(uuid,text) from public;
revoke all on function public.delete_meeting(uuid) from public;
revoke all on function public.delete_task(uuid) from public;
revoke all on function public.delete_google_event_artifact(uuid,text,text) from public;
revoke all on function public.save_google_event_artifact(uuid,text,text,jsonb,uuid[],uuid[],uuid[]) from public;
grant execute on function public.save_meeting(uuid,jsonb,jsonb,uuid[],uuid[]) to authenticated;
grant execute on function public.save_task(uuid,jsonb,uuid[],uuid[]) to authenticated;
grant execute on function public.close_meeting(uuid,text) to authenticated;
grant execute on function public.delete_meeting(uuid) to authenticated;
grant execute on function public.delete_task(uuid) to authenticated;
grant execute on function public.delete_google_event_artifact(uuid,text,text) to authenticated;
grant execute on function public.save_google_event_artifact(uuid,text,text,jsonb,uuid[],uuid[],uuid[]) to authenticated;

commit;
