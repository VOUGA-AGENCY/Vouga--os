create or replace function public.close_company_deal(
  p_company_id uuid,
  p_project_values jsonb,
  p_member_ids uuid[],
  p_contact_ids uuid[],
  p_task_ids uuid[],
  p_meeting_ids uuid[],
  p_decision_ids uuid[],
  p_cost_ids uuid[],
  p_scope_items jsonb,
  p_out_of_scope_items jsonb,
  p_milestones jsonb,
  p_resources jsonb,
  p_company_cae text default null,
  p_company_email text default null,
  p_company_phone text default null,
  p_company_website text default null,
  p_update_company_status boolean default true,
  p_log_interaction boolean default true,
  p_interaction_body text default null,
  p_interaction_contact_id uuid default null
) returns uuid language plpgsql security definer set search_path = public, pg_temp as $$
declare
  saved_project_id uuid;
  v_company record;
  v_cae text;
  v_email text;
  v_phone text;
  v_website text;
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  select *
  into v_company
  from public.companies
  where id = p_company_id
  for update;

  if not found then
    raise exception 'A Organização não existe.';
  end if;

  v_cae := coalesce(nullif(btrim(p_company_cae), ''), v_company.primary_cae);
  v_email := coalesce(nullif(btrim(p_company_email), ''), v_company.contact_email);
  v_phone := coalesce(nullif(btrim(p_company_phone), ''), v_company.contact_phone);
  v_website := coalesce(nullif(btrim(p_company_website), ''), v_company.website);

  if p_update_company_status then
    if v_cae is null or v_cae = '' then
      raise exception 'O CAE principal é obrigatório para ativar a Organização.';
    end if;

    if (v_email is null or v_email = '') and (v_phone is null or v_phone = '') then
      raise exception 'Indica pelo menos um email ou telefone de contacto para a Organização.';
    end if;
  end if;

  -- 1. Create the project atomically
  saved_project_id := public.create_project(
    p_project_values,
    p_member_ids,
    p_contact_ids,
    p_task_ids,
    p_meeting_ids,
    p_decision_ids,
    p_cost_ids,
    p_scope_items,
    p_out_of_scope_items,
    p_milestones,
    p_resources
  );

  -- 2. Update the company status and prospecting stage
  if p_update_company_status then
    update public.companies
    set prospecting_stage = 'agreed',
        status = case when status = 'archived' then 'archived' else 'active' end,
        primary_cae = v_cae,
        contact_email = v_email,
        contact_phone = v_phone,
        website = v_website,
        updated_at = timezone('utc'::text, now())
    where id = p_company_id;
  end if;

  -- 3. Record interaction in timeline if requested
  if p_log_interaction and p_interaction_body is not null and btrim(p_interaction_body) <> '' then
    insert into public.contact_interactions (
      company_id,
      contact_id,
      direction,
      channel,
      body,
      occurred_at,
      recorded_by_member_id
    ) values (
      p_company_id,
      p_interaction_contact_id,
      'outbound',
      'call',
      btrim(p_interaction_body),
      timezone('utc'::text, now()),
      auth.uid()
    );
  end if;

  return saved_project_id;
end;
$$;

revoke all on function public.close_company_deal(
  uuid, jsonb, uuid[], uuid[], uuid[], uuid[], uuid[], uuid[], jsonb, jsonb, jsonb, jsonb, text, text, text, text, boolean, boolean, text, uuid
) from public;

grant execute on function public.close_company_deal(
  uuid, jsonb, uuid[], uuid[], uuid[], uuid[], uuid[], uuid[], jsonb, jsonb, jsonb, jsonb, text, text, text, text, boolean, boolean, text, uuid
) to authenticated;
