begin;

drop trigger if exists meetings_require_active_closer on public.meetings;

commit;
