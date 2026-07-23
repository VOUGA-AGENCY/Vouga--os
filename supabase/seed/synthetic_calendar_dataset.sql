-- SYNTHETIC B007 CALENDAR SCENARIOS
-- Manual development aid only. Never auto-run locally or remotely.
-- Requires the W004 synthetic dataset and creates only deterministic B007 rows.

begin;

do $synthetic_b007$
declare
  selected_member uuid;
  reference_meeting public.meetings%rowtype;
  reference_company uuid;
begin
  if exists (select 1 from public.meetings where id::text like 'f007%')
    or exists (select 1 from public.tasks where id::text like 'f007%')
  then
    raise exception 'SYNTHETIC B007 reserved IDs already exist; run the controlled cleanup first';
  end if;

  select * into reference_meeting
  from public.meetings
  where id = 'f0040002-0000-4000-8000-000000000006';

  if reference_meeting.id is null then
    raise exception 'SYNTHETIC B007 requires the W004 operating dataset';
  end if;

  select id into selected_member
  from public.members
  where is_active = true
  order by id
  limit 1;

  if selected_member is null then
    raise exception 'SYNTHETIC B007 requires one active Member';
  end if;

  select company_id into reference_company
  from public.meeting_companies
  where meeting_id = reference_meeting.id
  order by company_id
  limit 1;

  insert into public.meetings (
    id, title, purpose, intended_result, status, closer_member_id,
    starts_at, ends_at, agenda, created_at, updated_at
  ) values (
    'f0070001-0000-4000-8000-000000000001',
    '[SYNTHETIC B007] Overlapping founder checkpoint',
    'Validar a leitura de duas Meetings que coincidem parcialmente.',
    'Sobreposição temporal legível sem inferir capacidade.',
    'planned',
    selected_member,
    reference_meeting.starts_at + interval '15 minutes',
    reference_meeting.starts_at + interval '60 minutes',
    'Contexto; compromisso; próximos passos.',
    now(),
    now()
  );

  if reference_company is not null then
    insert into public.meeting_companies (meeting_id, company_id)
    values ('f0070001-0000-4000-8000-000000000001', reference_company);
  end if;

  insert into public.tasks (
    id, title, expected_result, status, owner_member_id, due_at,
    origin_type, direct_origin_reason, created_at, updated_at
  ) values (
    'f0070002-0000-4000-8000-000000000001',
    '[SYNTHETIC B007] Resolver compromisso vencido',
    'A Task vencida tem owner e próximo movimento claros.',
    'in_progress',
    selected_member,
    now() - interval '1 day',
    'direct',
    'Cenário sintético para validar a faixa de Tasks vencidas no Calendar.',
    now() - interval '4 days',
    now() - interval '1 day'
  );

  if reference_company is not null then
    insert into public.task_companies (task_id, company_id)
    values ('f0070002-0000-4000-8000-000000000001', reference_company);
  end if;
end;
$synthetic_b007$;

commit;
