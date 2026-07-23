begin;

drop trigger if exists meetings_require_active_closer on public.meetings;
drop trigger if exists meeting_participants_require_active_member on public.meeting_participants;

drop function if exists public.require_active_meeting_closer();
drop function if exists public.require_active_meeting_participant();

create function public.require_active_meeting_closer()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not exists (
    select 1 from public.members
    where id = new.closer_member_id and is_active = true
  ) then
    raise exception 'Meeting closer must be an active member' using errcode = '23514';
  end if;

  return new;
end;
$$;

create function public.require_active_meeting_participant()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.member_id is not null and not exists (
    select 1 from public.members
    where id = new.member_id and is_active = true
  ) then
    raise exception 'Internal Meeting participant must be an active member'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

create trigger meetings_require_active_closer
before insert or update of closer_member_id on public.meetings
for each row execute function public.require_active_meeting_closer();

create trigger meeting_participants_require_active_member
before insert or update of member_id on public.meeting_participants
for each row execute function public.require_active_meeting_participant();

commit;
