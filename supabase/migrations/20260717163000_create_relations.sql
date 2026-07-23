begin;

create table public.contacts (
  id uuid primary key default gen_random_uuid(),
  display_name text not null,
  company_id uuid references public.companies(id) on delete restrict,
  owner_member_id uuid not null references public.members(id) on delete restrict,
  relationship_role text not null,
  job_title text,
  email text,
  linkedin_url text,
  phone text,
  avatar_url text,
  important_context text,
  strategic_at timestamptz,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint contacts_name_check check (char_length(btrim(display_name)) between 1 and 160),
  constraint contacts_role_check check (relationship_role in ('investor','advisor','client','prospect','partner','supplier','other')),
  constraint contacts_status_check check (status in ('active','archived')),
  constraint contacts_email_check check (email is null or char_length(btrim(email)) between 3 and 320),
  constraint contacts_linkedin_check check (linkedin_url is null or linkedin_url ~* '^https://(www\.)?linkedin\.com/'),
  constraint contacts_avatar_check check (avatar_url is null or avatar_url like 'https://%'),
  constraint contacts_context_check check (important_context is null or char_length(btrim(important_context)) between 1 and 6000)
);
create unique index contacts_email_unique on public.contacts(lower(email)) where email is not null;
create unique index contacts_linkedin_unique on public.contacts(lower(linkedin_url)) where linkedin_url is not null;
create index contacts_status_strategic_updated_idx on public.contacts(status, strategic_at desc, updated_at desc);
create index contacts_company_id_idx on public.contacts(company_id);
create index contacts_owner_member_id_idx on public.contacts(owner_member_id);
create trigger contacts_set_updated_at before update on public.contacts for each row execute function public.set_updated_at();

create table public.contact_message_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  channel text not null,
  body text not null,
  status text not null default 'active',
  created_by_member_id uuid not null references public.members(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint contact_templates_name_check check (char_length(btrim(name)) between 1 and 120),
  constraint contact_templates_channel_check check (channel in ('email','linkedin','call')),
  constraint contact_templates_body_check check (char_length(btrim(body)) between 1 and 8000),
  constraint contact_templates_status_check check (status in ('active','archived'))
);
create index contact_templates_status_channel_idx on public.contact_message_templates(status, channel, updated_at desc);
create trigger contact_templates_set_updated_at before update on public.contact_message_templates for each row execute function public.set_updated_at();

create table public.contact_interactions (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid not null references public.contacts(id) on delete restrict,
  direction text not null,
  channel text not null,
  body text not null,
  occurred_at timestamptz not null,
  reply_to_interaction_id uuid references public.contact_interactions(id) on delete restrict,
  source_template_id uuid references public.contact_message_templates(id) on delete set null,
  recorded_by_member_id uuid not null references public.members(id) on delete restrict,
  created_at timestamptz not null default now(),
  constraint contact_interactions_direction_check check (direction in ('inbound','outbound')),
  constraint contact_interactions_channel_check check (channel in ('email','linkedin','call')),
  constraint contact_interactions_body_check check (char_length(btrim(body)) between 1 and 12000),
  constraint contact_interactions_not_self_check check (reply_to_interaction_id is null or reply_to_interaction_id <> id)
);
create index contact_interactions_contact_occurred_idx on public.contact_interactions(contact_id, occurred_at desc);
create index contact_interactions_reply_idx on public.contact_interactions(reply_to_interaction_id);

create function public.validate_contact_interaction()
returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
declare parent_contact uuid; parent_time timestamptz; template_channel text;
begin
  if new.reply_to_interaction_id is not null then
    select contact_id, occurred_at into parent_contact, parent_time from public.contact_interactions where id=new.reply_to_interaction_id;
    if parent_contact is null or parent_contact <> new.contact_id or parent_time > new.occurred_at then
      raise exception 'Reply must reference an earlier interaction for the same Contact' using errcode='23514';
    end if;
  end if;
  if new.source_template_id is not null then
    select channel into template_channel from public.contact_message_templates where id=new.source_template_id;
    if new.direction <> 'outbound' or template_channel is null or template_channel <> new.channel then
      raise exception 'Template must match an outbound interaction channel' using errcode='23514';
    end if;
  end if;
  return new;
end; $$;
create trigger contact_interactions_validate before insert on public.contact_interactions for each row execute function public.validate_contact_interaction();

alter table public.meeting_participants add column contact_id uuid references public.contacts(id) on delete restrict;
alter table public.meeting_participants drop constraint meeting_participants_identity_check;
alter table public.meeting_participants add constraint meeting_participants_identity_check check (
  (member_id is not null and contact_id is null and external_name is null) or
  (member_id is null and contact_id is null and external_name is not null) or
  (member_id is null and contact_id is not null and external_name is not null)
);
create unique index meeting_participants_contact_unique on public.meeting_participants(meeting_id,contact_id) where contact_id is not null;

create or replace function public.save_meeting(p_meeting_id uuid,p_values jsonb,p_participants jsonb,p_company_ids uuid[])
returns uuid language plpgsql security invoker set search_path=public,pg_temp as $$
declare saved_meeting_id uuid;
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode='42501'; end if;
  if p_meeting_id is null then
    insert into public.meetings(title,purpose,intended_result,closer_member_id,starts_at,ends_at,agenda,notes,open_questions)
    values(btrim(p_values->>'title'),btrim(p_values->>'purpose'),nullif(btrim(p_values->>'intended_result'),''),(p_values->>'closer_member_id')::uuid,(p_values->>'starts_at')::timestamptz,(p_values->>'ends_at')::timestamptz,nullif(btrim(p_values->>'agenda'),''),nullif(btrim(p_values->>'notes'),''),nullif(btrim(p_values->>'open_questions'),'')) returning id into saved_meeting_id;
  else
    update public.meetings set title=btrim(p_values->>'title'),purpose=btrim(p_values->>'purpose'),intended_result=nullif(btrim(p_values->>'intended_result'),''),closer_member_id=(p_values->>'closer_member_id')::uuid,starts_at=(p_values->>'starts_at')::timestamptz,ends_at=(p_values->>'ends_at')::timestamptz,agenda=nullif(btrim(p_values->>'agenda'),''),notes=nullif(btrim(p_values->>'notes'),''),open_questions=nullif(btrim(p_values->>'open_questions'),'') where id=p_meeting_id and status in ('planned','needs_closure') returning id into saved_meeting_id;
    if saved_meeting_id is null then raise exception 'Meeting not found or no longer editable' using errcode='P0002'; end if;
    delete from public.meeting_participants where meeting_id=saved_meeting_id; delete from public.meeting_companies where meeting_id=saved_meeting_id;
  end if;
  insert into public.meeting_participants(meeting_id,member_id,contact_id,external_name)
  select saved_meeting_id,nullif(p->>'member_id','')::uuid,nullif(p->>'contact_id','')::uuid,
    case when nullif(p->>'contact_id','') is not null then (select display_name from public.contacts where id=(p->>'contact_id')::uuid) else nullif(btrim(p->>'external_name'),'') end
  from jsonb_array_elements(coalesce(p_participants,'[]'::jsonb)) p;
  insert into public.meeting_companies(meeting_id,company_id) select saved_meeting_id,company_id from unnest(coalesce(p_company_ids,'{}'::uuid[])) company_id;
  return saved_meeting_id;
end; $$;

alter table public.contacts enable row level security; alter table public.contact_message_templates enable row level security; alter table public.contact_interactions enable row level security;
create policy contacts_select_authenticated on public.contacts for select to authenticated using(auth.uid() is not null);
create policy contacts_insert_authenticated on public.contacts for insert to authenticated with check(auth.uid() is not null);
create policy contacts_update_authenticated on public.contacts for update to authenticated using(auth.uid() is not null) with check(auth.uid() is not null);
create policy templates_select_authenticated on public.contact_message_templates for select to authenticated using(auth.uid() is not null);
create policy templates_insert_authenticated on public.contact_message_templates for insert to authenticated with check(auth.uid() is not null);
create policy templates_update_authenticated on public.contact_message_templates for update to authenticated using(auth.uid() is not null) with check(auth.uid() is not null);
create policy interactions_select_authenticated on public.contact_interactions for select to authenticated using(auth.uid() is not null);
create policy interactions_insert_authenticated on public.contact_interactions for insert to authenticated with check(auth.uid() is not null);
revoke all on public.contacts,public.contact_message_templates,public.contact_interactions from anon;
grant select,insert,update on public.contacts,public.contact_message_templates to authenticated;
grant select,insert on public.contact_interactions to authenticated;
commit;
