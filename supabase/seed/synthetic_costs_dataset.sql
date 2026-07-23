-- SYNTHETIC B006 COSTS DATASET
-- Manual development aid only. Never auto-run. Requires the W004 synthetic dataset.
-- No real financial data is included.

begin;

do $synthetic_b006$
declare
  member_1 uuid;
begin
  select id into member_1 from public.members where is_active=true order by id limit 1;
  if member_1 is null then raise exception 'SYNTHETIC B006 requires one active member'; end if;
  if not exists (select 1 from public.companies where id='f0040001-0000-4000-8000-000000000001') then
    raise exception 'SYNTHETIC B006 requires synthetic_operating_dataset.sql first';
  end if;
  if exists (select 1 from public.costs where id::text like 'f006%')
    or exists (select 1 from public.cash_balance_snapshots where id::text like 'f006%') then
    raise exception 'SYNTHETIC B006 reserved IDs already exist; run cleanup first';
  end if;

  insert into public.costs (
    id,title,description,category,supplier,expected_amount_minor,actual_amount_minor,currency,
    cost_type,recurrence,expected_on,starts_on,billing_anchor_on,paid_on,ended_on,cancelled_on,
    status,owner_member_id,company_id,roadmap_item_id,source_decision_id,created_at,updated_at
  ) values
    ('f0060001-0000-4000-8000-000000000001','[SYNTHETIC B006] Supabase Pro','Infraestrutura mensal que suporta o Vouga OS.','infrastructure','Supabase',2500,null,'EUR','recurring','monthly',null,current_date-40,current_date-30,null,null,null,'active',member_1,null,'f0040006-0000-4000-8000-000000000001',null,now()-interval '40 days',now()-interval '1 day'),
    ('f0060001-0000-4000-8000-000000000002','[SYNTHETIC B006] Ferramenta de design','Licença anual usada na produção de trabalho para clientes.','software','Design Tools',14400,null,'EUR','recurring','yearly',null,current_date-180,current_date+20,null,null,null,'active',member_1,'f0040001-0000-4000-8000-000000000001',null,'f0040004-0000-4000-8000-000000000007',now()-interval '180 days',now()-interval '2 days'),
    ('f0060001-0000-4000-8000-000000000003','[SYNTHETIC B006] Research incentive','Incentivo pontual para validar linguagem clínica.','professional_services',null,35000,null,'EUR','one_off',null,current_date+5,null,null,null,null,null,'planned',member_1,'f0040001-0000-4000-8000-000000000005','f0040006-0000-4000-8000-000000000004','f0040004-0000-4000-8000-000000000004',now()-interval '3 days',now()-interval '3 days'),
    ('f0060001-0000-4000-8000-000000000004','[SYNTHETIC B006] Domínio anual','Renovação do domínio operacional.','infrastructure','Registrar',1800,1750,'EUR','one_off',null,current_date-12,null,null,current_date-10,null,null,'paid',member_1,null,null,null,now()-interval '20 days',now()-interval '10 days'),
    ('f0060001-0000-4000-8000-000000000005','[SYNTHETIC B006] Consultoria de segurança','Revisão prevista que deixou de ser necessária.','professional_services','Security Partner',90000,null,'EUR','one_off',null,current_date+30,null,null,null,null,current_date-2,'cancelled',member_1,null,null,null,now()-interval '12 days',now()-interval '2 days'),
    ('f0060001-0000-4000-8000-000000000006','[SYNTHETIC B006] Workspace temporário','Espaço usado durante uma fase presencial já terminada.','workspace_operations','Studio',30000,null,'EUR','recurring','monthly',null,current_date-150,current_date-145,null,current_date-20,null,'ended',member_1,null,null,null,now()-interval '150 days',now()-interval '20 days'),
    ('f0060001-0000-4000-8000-000000000007','[SYNTHETIC B006] Campanha piloto','Custo pontual previsto para testar aquisição.','marketing_sales',null,12000,null,'EUR','one_off',null,current_date-3,null,null,null,null,null,'planned',null,'f0040001-0000-4000-8000-000000000002',null,'f0040004-0000-4000-8000-000000000009',now()-interval '8 days',now()-interval '1 day');

  insert into public.cost_tasks(cost_id,task_id) values
    ('f0060001-0000-4000-8000-000000000001','f0040003-0000-4000-8000-000000000001'),
    ('f0060001-0000-4000-8000-000000000003','f0040003-0000-4000-8000-000000000009'),
    ('f0060001-0000-4000-8000-000000000007','f0040003-0000-4000-8000-000000000004');

  insert into public.cash_balance_snapshots(
    id,balance_minor,currency,confirmed_at,confirmed_by_member_id,description,created_at
  ) values (
    'f0060002-0000-4000-8000-000000000001',1850000,'EUR',now()-interval '15 days',
    member_1,'[SYNTHETIC B006] Saldo fictício para validar projeções.',now()-interval '15 days'
  );
end;
$synthetic_b006$;

commit;
