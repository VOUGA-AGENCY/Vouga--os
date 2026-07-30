begin;

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

  if not exists (select 1 from public.contacts where id = p_contact_id) then
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

  update public.contact_interactions
  set reply_to_interaction_id = null
  where contact_id = p_contact_id;

  delete from public.contact_interactions
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

  if not exists (select 1 from public.companies where id = p_company_id) then
    raise exception 'Organisation not found' using errcode = 'P0002';
  end if;

  if exists (select 1 from public.contacts where company_id = p_company_id) then
    raise exception 'Remove or reassign the Organisation profiles first' using errcode = '23503';
  end if;

  if exists (select 1 from public.meeting_companies where company_id = p_company_id)
    or exists (select 1 from public.task_companies where company_id = p_company_id)
    or exists (select 1 from public.decision_companies where company_id = p_company_id)
    or exists (select 1 from public.roadmap_item_companies where company_id = p_company_id)
    or exists (select 1 from public.costs where company_id = p_company_id)
    or exists (
      select 1 from public.google_event_artifact_companies where company_id = p_company_id
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
