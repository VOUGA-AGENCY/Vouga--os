begin;

alter table public.companies
  add column prospecting_stage text,
  add column primary_contact_id uuid references public.contacts(id) on delete set null,
  add constraint companies_prospecting_stage_check check (
    prospecting_stage is null or prospecting_stage in (
      'to_contact','contacted','replied','meeting_scheduled','not_interested'
    )
  );

create index companies_prospecting_stage_idx
  on public.companies(prospecting_stage, updated_at desc)
  where prospecting_stage is not null;

create function public.validate_company_primary_contact()
returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
begin
  if new.primary_contact_id is not null and not exists (
    select 1 from public.contacts
    where id=new.primary_contact_id and company_id=new.id and status='active'
  ) then
    raise exception 'Primary Contact must be active and belong to the Organisation' using errcode='23514';
  end if;
  return new;
end; $$;

create trigger companies_validate_primary_contact
before insert or update of primary_contact_id on public.companies
for each row execute function public.validate_company_primary_contact();

alter table public.tasks
  add column purpose text not null default 'work',
  add constraint tasks_purpose_check check (purpose in ('work','relationship_follow_up'));

create index tasks_relationship_follow_up_due_idx
  on public.tasks(due_at, status)
  where purpose='relationship_follow_up' and status not in ('completed','cancelled');

alter table public.contact_message_templates
  add column situation text not null default 'Geral',
  add constraint contact_templates_situation_check
    check (char_length(btrim(situation)) between 1 and 120);

alter table public.contacts drop constraint contacts_avatar_check;
alter table public.contacts add constraint contacts_avatar_check check (
  avatar_url is null or (
    char_length(avatar_url) <= 350000 and
    (avatar_url like 'https://%' or avatar_url like 'data:image/%')
  )
);

create function public.record_prospecting_touch(
  p_company_id uuid,
  p_contact_id uuid,
  p_channel text,
  p_note text,
  p_next_step text,
  p_follow_up_at timestamptz
) returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare created_task_id uuid;
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode='42501'; end if;
  if p_channel not in ('email','linkedin','call') then
    raise exception 'Invalid channel' using errcode='23514';
  end if;
  if not exists (
    select 1 from public.contacts
    where id=p_contact_id and company_id=p_company_id and status='active'
  ) then
    raise exception 'Contact must belong to the Organisation' using errcode='23514';
  end if;
  if char_length(btrim(p_note)) not between 1 and 12000 then
    raise exception 'Interaction note required' using errcode='23514';
  end if;

  insert into public.contact_interactions(
    contact_id,direction,channel,body,occurred_at,recorded_by_member_id
  ) values (p_contact_id,'outbound',p_channel,btrim(p_note),now(),auth.uid());

  update public.companies set
    primary_contact_id=coalesce(primary_contact_id,p_contact_id),
    prospecting_stage=case
      when prospecting_stage='not_interested' then prospecting_stage
      else 'contacted'
    end
  where id=p_company_id and status<>'archived';
  if not found then raise exception 'Organisation unavailable' using errcode='P0002'; end if;

  if nullif(btrim(coalesce(p_next_step,'')),'') is not null then
    if p_follow_up_at is null then
      raise exception 'Follow-up date required' using errcode='23514';
    end if;
    insert into public.tasks(
      title,expected_result,status,owner_member_id,due_at,origin_type,purpose
    ) values (
      btrim(p_next_step),null,'todo',auth.uid(),p_follow_up_at,'planning','relationship_follow_up'
    ) returning id into created_task_id;
    insert into public.task_companies(task_id,company_id) values(created_task_id,p_company_id);
  end if;
end; $$;

revoke all on function public.record_prospecting_touch(uuid,uuid,text,text,text,timestamptz) from public,anon;
grant execute on function public.record_prospecting_touch(uuid,uuid,text,text,text,timestamptz) to authenticated;

commit;
