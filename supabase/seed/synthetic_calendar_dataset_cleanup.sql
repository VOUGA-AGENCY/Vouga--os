-- CONTROLLED CLEANUP FOR SYNTHETIC B007 CALENDAR SCENARIOS
-- Removes only deterministic B007 rows.

begin;

delete from public.task_companies where task_id::text like 'f007%';
delete from public.task_meetings where task_id::text like 'f007%';
delete from public.meeting_companies where meeting_id::text like 'f007%';
delete from public.meeting_participants where meeting_id::text like 'f007%';
delete from public.tasks where id::text like 'f007%';
delete from public.meetings where id::text like 'f007%';

commit;
