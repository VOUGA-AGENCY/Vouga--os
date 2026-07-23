-- SYNTHETIC W004 CONTROLLED CLEANUP
-- Removes only the fixed W004 namespace. It never deletes members or auth.users.

begin;

do $synthetic_w004_cleanup$
begin
  if exists (
    select 1 from public.companies
    where id::text like 'f004%' and name not like '[SYNTHETIC W004]%'
  ) or exists (
    select 1 from public.meetings
    where id::text like 'f004%' and title not like '[SYNTHETIC W004]%'
  ) or exists (
    select 1 from public.tasks
    where id::text like 'f004%' and title not like '[SYNTHETIC W004]%'
  ) or exists (
    select 1 from public.decisions
    where id::text like 'f004%' and title not like '[SYNTHETIC W004]%'
  ) or exists (
    select 1 from public.sprints
    where id::text like 'f004%' and name not like '[SYNTHETIC W004]%'
  ) or exists (
    select 1 from public.roadmap_items
    where id::text like 'f004%' and title not like '[SYNTHETIC W004]%'
  ) then
    raise exception 'Cleanup stopped: the f004 namespace contains a row without the SYNTHETIC W004 marker';
  end if;

  delete from public.roadmap_item_decisions
  where roadmap_item_id::text like 'f004%' or decision_id::text like 'f004%';
  delete from public.roadmap_item_sprints
  where roadmap_item_id::text like 'f004%' or sprint_id::text like 'f004%';
  delete from public.roadmap_item_tasks
  where roadmap_item_id::text like 'f004%' or task_id::text like 'f004%';
  delete from public.roadmap_item_companies
  where roadmap_item_id::text like 'f004%' or company_id::text like 'f004%';
  delete from public.roadmap_items where id::text like 'f004%';

  delete from public.sprint_tasks
  where sprint_id::text like 'f004%' or task_id::text like 'f004%';
  delete from public.sprints where id::text like 'f004%';

  delete from public.decision_tasks where decision_id::text like 'f004%' or task_id::text like 'f004%';
  delete from public.task_meetings
  where task_id::text like 'f004%' or meeting_id::text like 'f004%';
  delete from public.task_companies
  where task_id::text like 'f004%' or company_id::text like 'f004%';
  delete from public.tasks where id::text like 'f004%';

  delete from public.decision_revisions
  where decision_id::text like 'f004%' or previous_decision_id::text like 'f004%';
  delete from public.decision_meetings
  where decision_id::text like 'f004%' or meeting_id::text like 'f004%';
  delete from public.decision_companies
  where decision_id::text like 'f004%' or company_id::text like 'f004%';
  delete from public.decisions where id::text like 'f004%';

  delete from public.meeting_participants where meeting_id::text like 'f004%';
  delete from public.meeting_companies
  where meeting_id::text like 'f004%' or company_id::text like 'f004%';
  delete from public.meetings where id::text like 'f004%';

  delete from public.companies where id::text like 'f004%';
end;
$synthetic_w004_cleanup$;

commit;
