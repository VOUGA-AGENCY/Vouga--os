-- Removes only deterministic Relations fixtures.
begin;
delete from public.meeting_participants where contact_id::text like 'f011%';
delete from public.contact_interactions where id::text like 'f011%';
delete from public.contact_message_templates where id::text like 'f011%';
delete from public.contacts where id::text like 'f011%';
commit;
