-- SYNTHETIC W004 DEVELOPMENT DATASET
-- Manual development aid only. This file is not a migration and is never auto-run.
-- It reuses up to three existing active public.members and never creates auth.users.
-- Safe-fail rules: reserved IDs must be absent and no other Sprint may be active.
-- dataset-count: companies=7
-- dataset-count: meetings=12
-- dataset-count: tasks=24
-- dataset-count: decisions=9
-- dataset-count: sprints=4
-- dataset-count: roadmap_items=10

begin;

do $synthetic_w004$
declare
  member_ids uuid[];
  member_1 uuid;
  member_2 uuid;
  member_3 uuid;
begin
  select array_agg(id order by id)
  into member_ids
  from (
    select id
    from public.members
    where is_active = true
    order by id
    limit 3
  ) as active_members;

  if coalesce(cardinality(member_ids), 0) = 0 then
    raise exception 'SYNTHETIC W004 requires at least one active public.members row';
  end if;

  member_1 := member_ids[1];
  member_2 := coalesce(member_ids[2], member_1);
  member_3 := coalesce(member_ids[3], member_2);

  if exists (select 1 from public.companies where id::text like 'f004%')
    or exists (select 1 from public.meetings where id::text like 'f004%')
    or exists (select 1 from public.tasks where id::text like 'f004%')
    or exists (select 1 from public.decisions where id::text like 'f004%')
    or exists (select 1 from public.sprints where id::text like 'f004%')
    or exists (select 1 from public.roadmap_items where id::text like 'f004%')
  then
    raise exception 'SYNTHETIC W004 reserved IDs already exist; run the controlled cleanup first';
  end if;

  if exists (select 1 from public.sprints where status = 'active') then
    raise exception 'SYNTHETIC W004 will not alter an existing active Sprint; close or cancel it before applying';
  end if;

  insert into public.companies (
    id, name, status, owner_member_id, current_context, relationship_risks, created_at, updated_at
  ) values
    ('f0040001-0000-4000-8000-000000000001', '[SYNTHETIC W004] Alder Foods', 'active', member_1,
      'A equipa está a preparar um piloto de reposicionamento para a linha urbana.',
      'A decisão final depende de validação do conselho até ao fim do ciclo.',
      now() - interval '70 days', now() - interval '2 days'),
    ('f0040001-0000-4000-8000-000000000002', '[SYNTHETIC W004] Northline Mobility', 'active', member_2,
      'Discovery concluída; falta consolidar a proposta operacional e o plano de lançamento.',
      null, now() - interval '62 days', now() - interval '1 day'),
    ('f0040001-0000-4000-8000-000000000003', '[SYNTHETIC W004] Lume Hospitality', 'active', member_3,
      'A identidade está aprovada e o trabalho está concentrado no sistema de reservas.',
      'Integração do fornecedor externo ainda sem data confirmada.',
      now() - interval '55 days', now() - interval '4 days'),
    ('f0040001-0000-4000-8000-000000000004', '[SYNTHETIC W004] Orbe Education', 'inactive', member_1,
      'Projeto entregue; relação em acompanhamento trimestral.',
      null, now() - interval '120 days', now() - interval '18 days'),
    ('f0040001-0000-4000-8000-000000000005', '[SYNTHETIC W004] Cais Health', 'active', member_2,
      'A equipa está a validar a arquitetura de informação antes do protótipo.',
      'Acesso a especialistas clínicos continua limitado.',
      now() - interval '38 days', now() - interval '3 days'),
    ('f0040001-0000-4000-8000-000000000006', '[SYNTHETIC W004] Vale Energy', 'inactive', member_3,
      'Proposta enviada e sem movimento operacional desde a última revisão.',
      'Janela de investimento poderá ser adiada para o próximo trimestre.',
      now() - interval '44 days', now() - interval '21 days'),
    ('f0040001-0000-4000-8000-000000000007', '[SYNTHETIC W004] Fio Commerce', 'archived', member_1,
      'Relação encerrada após entrega do diagnóstico inicial.',
      null, now() - interval '180 days', now() - interval '90 days');

  insert into public.meetings (
    id, title, purpose, intended_result, status, closer_member_id,
    starts_at, ends_at, agenda, notes, open_questions, conclusion, closed_at,
    created_at, updated_at
  ) values
    ('f0040002-0000-4000-8000-000000000001', '[SYNTHETIC W004] Kickoff Alder',
      'Alinhar o problema, as fronteiras do piloto e a cadência de decisão.',
      'Âmbito e responsáveis confirmados.', 'closed', member_1,
      now() - interval '34 days', now() - interval '34 days' + interval '60 minutes',
      'Problema; âmbito; responsáveis; próximos passos.',
      'O piloto deve privilegiar duas lojas e uma única mensagem central.',
      null, 'Piloto limitado a duas lojas, com revisão semanal e decisão final no fim do mês.',
      now() - interval '34 days' + interval '65 minutes', now() - interval '36 days', now() - interval '34 days'),
    ('f0040002-0000-4000-8000-000000000002', '[SYNTHETIC W004] Revisão de conceito Alder',
      'Escolher a direção de posicionamento a testar.',
      'Uma direção aprovada para prototipagem.', 'closed', member_2,
      now() - interval '18 days', now() - interval '18 days' + interval '45 minutes',
      'Evidência; alternativas; escolha.',
      'A direção editorial demonstrou maior clareza nos testes internos.',
      null, 'Avançar com a direção editorial e retirar a alternativa promocional.',
      now() - interval '18 days' + interval '50 minutes', now() - interval '20 days', now() - interval '18 days'),
    ('f0040002-0000-4000-8000-000000000003', '[SYNTHETIC W004] Northline discovery',
      'Mapear o fluxo de aquisição e as fricções da equipa comercial.',
      'Mapa de problemas priorizado.', 'closed', member_2,
      now() - interval '27 days', now() - interval '27 days' + interval '75 minutes',
      'Fluxo atual; evidência; problemas; prioridades.',
      'A proposta perde contexto entre qualificação e demonstração.',
      null, 'Priorizar continuidade de contexto e um único handoff comercial.',
      now() - interval '27 days' + interval '80 minutes', now() - interval '29 days', now() - interval '27 days'),
    ('f0040002-0000-4000-8000-000000000004', '[SYNTHETIC W004] Arquitetura Lume',
      'Fechar a arquitetura do sistema de reservas.',
      'Estrutura aprovada e dependências externas identificadas.', 'needs_closure', member_3,
      now() - interval '2 days', now() - interval '2 days' + interval '60 minutes',
      'Fluxos; integrações; riscos; decisão.',
      'O fornecedor confirmou limitações na sincronização de disponibilidade.',
      'Aceitamos atualização com atraso de quinze minutos?',
      null, null, now() - interval '4 days', now() - interval '2 days'),
    ('f0040002-0000-4000-8000-000000000005', '[SYNTHETIC W004] Cais research sync',
      'Consolidar evidência das entrevistas clínicas.',
      'Hipóteses de navegação ordenadas por risco.', 'needs_closure', member_1,
      now() - interval '1 day', now() - interval '1 day' + interval '45 minutes',
      'Padrões; exceções; hipóteses; próximos testes.',
      'A terminologia varia entre especialidades e precisa de validação adicional.',
      'Que nomenclatura é transversal sem perder precisão?',
      null, null, now() - interval '3 days', now() - interval '1 day'),
    ('f0040002-0000-4000-8000-000000000006', '[SYNTHETIC W004] Planeamento do piloto Alder',
      'Confirmar preparação do piloto e critérios de observação.',
      'Checklist de lançamento aceite.', 'planned', member_1,
      now() + interval '1 day', now() + interval '1 day' + interval '45 minutes',
      'Estado; bloqueios; checklist; métricas de observação.',
      null, null, null, null, now() - interval '2 days', now() - interval '2 days'),
    ('f0040002-0000-4000-8000-000000000007', '[SYNTHETIC W004] Proposta Northline',
      'Rever a proposta operacional antes de apresentação.',
      'Narrativa, âmbito e investimento prontos.', 'planned', member_2,
      now() + interval '3 days', now() + interval '3 days' + interval '60 minutes',
      'Narrativa; entregáveis; riscos; próximos passos.',
      null, null, null, null, now() - interval '2 days', now() - interval '1 day'),
    ('f0040002-0000-4000-8000-000000000008', '[SYNTHETIC W004] Lume vendor checkpoint',
      'Obter compromisso do fornecedor sobre a integração.',
      'Datas e owner técnico confirmados.', 'planned', member_3,
      now() + interval '5 days', now() + interval '5 days' + interval '30 minutes',
      'API; calendário; owner; riscos.',
      null, null, null, null, now() - interval '1 day', now() - interval '1 day'),
    ('f0040002-0000-4000-8000-000000000009', '[SYNTHETIC W004] Orbe quarterly review',
      'Rever resultados após entrega e detetar necessidades reais.',
      'Decidir se existe trabalho adicional.', 'planned', member_1,
      now() + interval '8 days', now() + interval '8 days' + interval '45 minutes',
      'Resultados; feedback; mudanças; decisão.',
      null, null, null, null, now() - interval '5 days', now() - interval '5 days'),
    ('f0040002-0000-4000-8000-000000000010', '[SYNTHETIC W004] Vale investment window',
      'Confirmar se o investimento avança neste trimestre.',
      'Janela e responsável de decisão claros.', 'cancelled', member_3,
      now() - interval '6 days', now() - interval '6 days' + interval '30 minutes',
      'Orçamento; calendário; decisão.',
      null, null, null, null, now() - interval '9 days', now() - interval '7 days'),
    ('f0040002-0000-4000-8000-000000000011', '[SYNTHETIC W004] Fio diagnostic handoff',
      'Entregar o diagnóstico e encerrar a relação.',
      'Conclusões compreendidas e ficheiros entregues.', 'closed', member_1,
      now() - interval '92 days', now() - interval '92 days' + interval '45 minutes',
      'Diagnóstico; recomendações; entrega.',
      'A equipa decidiu executar internamente as recomendações.',
      null, 'Diagnóstico entregue; não existe trabalho adicional acordado.',
      now() - interval '92 days' + interval '48 minutes', now() - interval '95 days', now() - interval '92 days'),
    ('f0040002-0000-4000-8000-000000000012', '[SYNTHETIC W004] Cais prototype review',
      'Testar a primeira estrutura de navegação com stakeholders.',
      'Principais alterações priorizadas.', 'planned', member_2,
      now() + interval '12 days', now() + interval '12 days' + interval '60 minutes',
      'Cenários; protótipo; observações; decisões.',
      null, null, null, null, now(), now());

  insert into public.meeting_companies (meeting_id, company_id) values
    ('f0040002-0000-4000-8000-000000000001', 'f0040001-0000-4000-8000-000000000001'),
    ('f0040002-0000-4000-8000-000000000002', 'f0040001-0000-4000-8000-000000000001'),
    ('f0040002-0000-4000-8000-000000000003', 'f0040001-0000-4000-8000-000000000002'),
    ('f0040002-0000-4000-8000-000000000004', 'f0040001-0000-4000-8000-000000000003'),
    ('f0040002-0000-4000-8000-000000000005', 'f0040001-0000-4000-8000-000000000005'),
    ('f0040002-0000-4000-8000-000000000006', 'f0040001-0000-4000-8000-000000000001'),
    ('f0040002-0000-4000-8000-000000000007', 'f0040001-0000-4000-8000-000000000002'),
    ('f0040002-0000-4000-8000-000000000008', 'f0040001-0000-4000-8000-000000000003'),
    ('f0040002-0000-4000-8000-000000000009', 'f0040001-0000-4000-8000-000000000004'),
    ('f0040002-0000-4000-8000-000000000010', 'f0040001-0000-4000-8000-000000000006'),
    ('f0040002-0000-4000-8000-000000000011', 'f0040001-0000-4000-8000-000000000007'),
    ('f0040002-0000-4000-8000-000000000012', 'f0040001-0000-4000-8000-000000000005');

  insert into public.meeting_participants (id, meeting_id, member_id, external_name)
  select
    ('f0040007-0000-4000-8000-' || lpad((row_number() over (
      order by meeting_id, member_id nulls last, external_name nulls last
    ))::text, 12, '0'))::uuid,
    meeting_id,
    member_id,
    external_name
  from (
    select distinct meeting_id, member_id, external_name
    from (values
      ('f0040002-0000-4000-8000-000000000001'::uuid, member_1, null::text),
      ('f0040002-0000-4000-8000-000000000001'::uuid, member_2, null::text),
      ('f0040002-0000-4000-8000-000000000001'::uuid, null::uuid, 'Synthetic Client Lead'),
      ('f0040002-0000-4000-8000-000000000002'::uuid, member_1, null::text),
      ('f0040002-0000-4000-8000-000000000002'::uuid, member_3, null::text),
      ('f0040002-0000-4000-8000-000000000003'::uuid, member_2, null::text),
      ('f0040002-0000-4000-8000-000000000003'::uuid, null::uuid, 'Synthetic Sales Director'),
      ('f0040002-0000-4000-8000-000000000004'::uuid, member_3, null::text),
      ('f0040002-0000-4000-8000-000000000004'::uuid, null::uuid, 'Synthetic Vendor Engineer'),
      ('f0040002-0000-4000-8000-000000000005'::uuid, member_1, null::text),
      ('f0040002-0000-4000-8000-000000000005'::uuid, member_2, null::text),
      ('f0040002-0000-4000-8000-000000000006'::uuid, member_1, null::text),
      ('f0040002-0000-4000-8000-000000000007'::uuid, member_2, null::text),
      ('f0040002-0000-4000-8000-000000000008'::uuid, member_3, null::text),
      ('f0040002-0000-4000-8000-000000000009'::uuid, member_1, null::text),
      ('f0040002-0000-4000-8000-000000000010'::uuid, member_3, null::text),
      ('f0040002-0000-4000-8000-000000000011'::uuid, member_1, null::text),
      ('f0040002-0000-4000-8000-000000000012'::uuid, member_2, null::text),
      ('f0040002-0000-4000-8000-000000000012'::uuid, null::uuid, 'Synthetic Clinical Advisor')
    ) as participant_values(meeting_id, member_id, external_name)
  ) as participants;

  insert into public.decisions (
    id, title, choice, reason, alternatives, impact, status,
    authority_member_id, decided_on, origin_meeting_id, created_at, updated_at
  ) values
    ('f0040004-0000-4000-8000-000000000001', '[SYNTHETIC W004] Testar mensagem promocional',
      'Usar uma mensagem centrada em desconto no piloto Alder.',
      'Era a hipótese mais rápida de produzir.', 'Direção editorial e direção de produto.',
      'Define o conteúdo inicial do piloto.', 'superseded', member_1, current_date - 24,
      'f0040002-0000-4000-8000-000000000001', now() - interval '24 days', now() - interval '18 days'),
    ('f0040004-0000-4000-8000-000000000002', '[SYNTHETIC W004] Adiar integração Lume',
      'Adiar a integração até o fornecedor garantir sincronização em tempo real.',
      'O risco de disponibilidade incorreta era material.', 'Sincronização periódica controlada.',
      'Bloqueia o lançamento do fluxo completo.', 'revoked', member_3, current_date - 15,
      'f0040002-0000-4000-8000-000000000004', now() - interval '15 days', now() - interval '5 days'),
    ('f0040004-0000-4000-8000-000000000003', '[SYNTHETIC W004] Um handoff comercial',
      'Concentrar qualificação e preparação da demonstração num único handoff.',
      'A perda de contexto ocorre na transição entre equipas.', 'Adicionar documentação sem alterar ownership.',
      'Reduz repetição e torna o fluxo mensurável.', 'current', member_2, current_date - 22,
      'f0040002-0000-4000-8000-000000000003', now() - interval '22 days', now() - interval '22 days'),
    ('f0040004-0000-4000-8000-000000000004', '[SYNTHETIC W004] Validar terminologia clínica',
      'Testar dois vocabulários antes de consolidar a arquitetura Cais.',
      'As entrevistas revelaram diferenças entre especialidades.', 'Escolher já uma nomenclatura transversal.',
      'Adiciona uma ronda curta de teste e reduz risco de compreensão.', 'current', member_1, current_date - 1,
      'f0040002-0000-4000-8000-000000000005', now() - interval '1 day', now() - interval '1 day'),
    ('f0040004-0000-4000-8000-000000000005', '[SYNTHETIC W004] Proposta Northline modular',
      'Apresentar a proposta em duas fases com decisão explícita entre diagnóstico e execução.',
      'A organização ainda não validou capacidade interna para executar.',
      'Contrato único com âmbito fechado.',
      'Reduz compromisso prematuro e clarifica o próximo passo.', 'current', member_2, current_date - 4,
      null, now() - interval '4 days', now() - interval '4 days'),
    ('f0040004-0000-4000-8000-000000000006', '[SYNTHETIC W004] Encerrar relação Fio',
      'Não propor trabalho adicional após a entrega do diagnóstico.',
      'A equipa escolheu executar internamente e não existe problema novo validado.',
      null, 'Arquiva a relação sem apagar o histórico.', 'current', member_1, current_date - 90,
      'f0040002-0000-4000-8000-000000000011', now() - interval '90 days', now() - interval '90 days'),
    ('f0040004-0000-4000-8000-000000000007', '[SYNTHETIC W004] Priorizar mensagem editorial',
      'Substituir a mensagem promocional por uma narrativa editorial centrada no uso.',
      'Os testes internos mostraram maior clareza e diferenciação.',
      'Manter desconto como mensagem principal.',
      'Reorienta conceito, protótipo e critérios do piloto.', 'current', member_2, current_date - 18,
      'f0040002-0000-4000-8000-000000000002', now() - interval '18 days', now() - interval '18 days'),
    ('f0040004-0000-4000-8000-000000000008', '[SYNTHETIC W004] Aceitar sincronização periódica Lume',
      'Revogar o adiamento e aceitar sincronização de disponibilidade a cada quinze minutos.',
      'O risco é controlável com indicação de confirmação e desbloqueia o piloto.',
      'Esperar por sincronização em tempo real.',
      'Permite lançar o piloto com uma limitação explícita.', 'current', member_3, current_date - 5,
      null, now() - interval '5 days', now() - interval '5 days'),
    ('f0040004-0000-4000-8000-000000000009', '[SYNTHETIC W004] Limitar handoff ao segmento enterprise',
      'Aplicar o handoff único apenas a oportunidades enterprise durante o piloto.',
      'O volume do segmento pequeno não justifica a mesma coordenação.',
      'Aplicar a todos os segmentos.',
      'Mantém a decisão principal e reduz o âmbito de teste.', 'current', member_2, current_date - 8,
      null, now() - interval '8 days', now() - interval '8 days');

  insert into public.decision_revisions (decision_id, previous_decision_id, effect) values
    ('f0040004-0000-4000-8000-000000000007', 'f0040004-0000-4000-8000-000000000001', 'supersedes'),
    ('f0040004-0000-4000-8000-000000000008', 'f0040004-0000-4000-8000-000000000002', 'revokes'),
    ('f0040004-0000-4000-8000-000000000009', 'f0040004-0000-4000-8000-000000000003', 'limits');

  insert into public.tasks (
    id, title, expected_result, status, owner_member_id, due_at,
    blocked_reason, blocked_next_move, completion_note, completed_at,
    origin_type, origin_meeting_id, origin_decision_id, direct_origin_reason,
    created_at, updated_at
  ) values
    ('f0040003-0000-4000-8000-000000000001', '[SYNTHETIC W004] Fechar checklist do piloto Alder',
      'Checklist aceite por todos os responsáveis do piloto.', 'in_progress', member_1, now() + interval '1 day',
      null, null, null, null, 'meeting', 'f0040002-0000-4000-8000-000000000002', null, null,
      now() - interval '17 days', now() - interval '1 day'),
    ('f0040003-0000-4000-8000-000000000002', '[SYNTHETIC W004] Produzir protótipo editorial Alder',
      'Protótipo navegável com a direção editorial aprovada.', 'completed', member_2, now() - interval '4 days',
      null, null, 'Protótipo entregue para preparação do piloto.', now() - interval '5 days',
      'decision', null, 'f0040004-0000-4000-8000-000000000007', null,
      now() - interval '17 days', now() - interval '5 days'),
    ('f0040003-0000-4000-8000-000000000003', '[SYNTHETIC W004] Confirmar lojas do piloto',
      'Duas lojas com responsáveis e datas confirmados.', 'blocked', member_1, now() + interval '2 days',
      'O conselho ainda não confirmou a segunda loja.',
      'Obter decisão na reunião de planeamento e fechar a seleção no próprio dia.',
      null, null, 'meeting', 'f0040002-0000-4000-8000-000000000001', null, null,
      now() - interval '30 days', now() - interval '2 hours'),
    ('f0040003-0000-4000-8000-000000000004', '[SYNTHETIC W004] Estruturar proposta Northline',
      'Proposta modular pronta para revisão interna.', 'in_progress', member_2, now() + interval '3 days',
      null, null, null, null, 'decision', null, 'f0040004-0000-4000-8000-000000000005', null,
      now() - interval '4 days', now() - interval '1 day'),
    ('f0040003-0000-4000-8000-000000000005', '[SYNTHETIC W004] Desenhar handoff enterprise',
      'Fluxo de handoff documentado com owner e informação mínima.', 'todo', member_3, now() + interval '6 days',
      null, null, null, null, 'decision', null, 'f0040004-0000-4000-8000-000000000009', null,
      now() - interval '8 days', now() - interval '3 days'),
    ('f0040003-0000-4000-8000-000000000006', '[SYNTHETIC W004] Recolher métricas do fluxo Northline',
      'Baseline de tempo e repetição disponível antes do piloto.', 'todo', member_2, now() + interval '9 days',
      null, null, null, null, 'meeting', 'f0040002-0000-4000-8000-000000000003', null, null,
      now() - interval '20 days', now() - interval '6 days'),
    ('f0040003-0000-4000-8000-000000000007', '[SYNTHETIC W004] Prototipar disponibilidade Lume',
      'Fluxo apresenta sincronização periódica e confirmação final.', 'in_progress', member_3, now() + interval '4 days',
      null, null, null, null, 'decision', null, 'f0040004-0000-4000-8000-000000000008', null,
      now() - interval '5 days', now() - interval '10 hours'),
    ('f0040003-0000-4000-8000-000000000008', '[SYNTHETIC W004] Confirmar owner técnico Lume',
      'Owner e calendário da integração confirmados pelo fornecedor.', 'blocked', member_3, now() + interval '5 days',
      'O fornecedor ainda não nomeou um owner técnico.',
      'Usar o checkpoint agendado para obter nome, responsabilidade e primeira data.',
      null, null, 'meeting', 'f0040002-0000-4000-8000-000000000004', null, null,
      now() - interval '2 days', now() - interval '4 hours'),
    ('f0040003-0000-4000-8000-000000000009', '[SYNTHETIC W004] Preparar teste de terminologia Cais',
      'Dois vocabulários testáveis com cenários equivalentes.', 'in_progress', member_1, now() + interval '7 days',
      null, null, null, null, 'decision', null, 'f0040004-0000-4000-8000-000000000004', null,
      now() - interval '1 day', now() - interval '3 hours'),
    ('f0040003-0000-4000-8000-000000000010', '[SYNTHETIC W004] Recrutar especialistas clínicos',
      'Três especialistas confirmados para a ronda de teste.', 'blocked', member_2, now() + interval '4 days',
      'O parceiro ainda não disponibilizou contactos elegíveis.',
      'Pedir uma lista curta até amanhã e reduzir a ronda a dois participantes se necessário.',
      null, null, 'meeting', 'f0040002-0000-4000-8000-000000000005', null, null,
      now() - interval '1 day', now() - interval '1 hour'),
    ('f0040003-0000-4000-8000-000000000011', '[SYNTHETIC W004] Consolidar arquitetura Cais',
      'Arquitetura de informação pronta para protótipo.', 'todo', member_1, now() + interval '14 days',
      null, null, null, null, 'direct', null, null, 'Necessidade identificada durante revisão interna.',
      now() - interval '6 days', now() - interval '2 days'),
    ('f0040003-0000-4000-8000-000000000012', '[SYNTHETIC W004] Preparar review trimestral Orbe',
      'Resultados e perguntas reunidos numa leitura curta.', 'todo', member_1, now() + interval '8 days',
      null, null, null, null, 'direct', null, null, 'Cadência trimestral acordada na entrega.',
      now() - interval '5 days', now() - interval '5 days'),
    ('f0040003-0000-4000-8000-000000000013', '[SYNTHETIC W004] Rever janela Vale',
      'Decisão documentada sobre reabrir ou manter a relação inativa.', 'cancelled', member_3, null,
      null, null, null, null, 'meeting', 'f0040002-0000-4000-8000-000000000010', null, null,
      now() - interval '9 days', now() - interval '7 days'),
    ('f0040003-0000-4000-8000-000000000014', '[SYNTHETIC W004] Arquivar materiais Fio',
      'Materiais finais organizados e acessíveis para consulta.', 'completed', member_1, now() - interval '88 days',
      null, null, 'Materiais finais organizados após o handoff.', now() - interval '89 days',
      'decision', null, 'f0040004-0000-4000-8000-000000000006', null,
      now() - interval '90 days', now() - interval '89 days'),
    ('f0040003-0000-4000-8000-000000000015', '[SYNTHETIC W004] Definir critérios de observação Alder',
      'Cinco sinais observáveis e respetiva forma de registo.', 'completed', member_2, now() - interval '2 days',
      null, null, 'Critérios anexados à checklist do piloto.', now() - interval '3 days',
      'direct', null, null, 'Preparação operacional do piloto.',
      now() - interval '10 days', now() - interval '3 days'),
    ('f0040003-0000-4000-8000-000000000016', '[SYNTHETIC W004] Rever investimento da proposta Northline',
      'Investimento coerente com as duas fases e respetivos riscos.', 'todo', member_1, now() + interval '2 days',
      null, null, null, null, 'direct', null, null, 'Revisão interna antes da apresentação.',
      now() - interval '2 days', now() - interval '1 day'),
    ('f0040003-0000-4000-8000-000000000017', '[SYNTHETIC W004] Documentar limitação de sincronização',
      'Limitação comunicada sem ambiguidade no protótipo e na proposta.', 'todo', member_3, now() + interval '5 days',
      null, null, null, null, 'decision', null, 'f0040004-0000-4000-8000-000000000008', null,
      now() - interval '5 days', now() - interval '4 days'),
    ('f0040003-0000-4000-8000-000000000018', '[SYNTHETIC W004] Preparar guião Cais',
      'Guião cobre os dois vocabulários sem enviesar respostas.', 'todo', member_2, now() + interval '6 days',
      null, null, null, null, 'meeting', 'f0040002-0000-4000-8000-000000000005', null, null,
      now() - interval '1 day', now() - interval '1 day'),
    ('f0040003-0000-4000-8000-000000000019', '[SYNTHETIC W004] Fechar conclusão da reunião Lume',
      'Conclusão persistida com decisão e consequências explícitas.', 'todo', member_3, now() + interval '1 day',
      null, null, null, null, 'meeting', 'f0040002-0000-4000-8000-000000000004', null, null,
      now() - interval '2 days', now() - interval '2 hours'),
    ('f0040003-0000-4000-8000-000000000020', '[SYNTHETIC W004] Fechar conclusão da research sync',
      'Conclusão persistida e trabalho de teste confirmado.', 'in_progress', member_1, now() + interval '1 day',
      null, null, null, null, 'meeting', 'f0040002-0000-4000-8000-000000000005', null, null,
      now() - interval '1 day', now() - interval '30 minutes'),
    ('f0040003-0000-4000-8000-000000000021', '[SYNTHETIC W004] Mapear conteúdo do piloto Alder',
      'Conteúdo necessário por touchpoint identificado.', 'completed', member_3, now() - interval '7 days',
      null, null, 'Mapa utilizado no protótipo editorial.', now() - interval '8 days',
      'meeting', 'f0040002-0000-4000-8000-000000000002', null, null,
      now() - interval '16 days', now() - interval '8 days'),
    ('f0040003-0000-4000-8000-000000000022', '[SYNTHETIC W004] Validar narrativa Northline',
      'Narrativa compreendida por alguém fora da equipa do projeto.', 'todo', member_2, now() + interval '2 days',
      null, null, null, null, 'decision', null, 'f0040004-0000-4000-8000-000000000005', null,
      now() - interval '4 days', now() - interval '2 days'),
    ('f0040003-0000-4000-8000-000000000023', '[SYNTHETIC W004] Preparar métricas do piloto Lume',
      'Métricas de sucesso e falha definidas antes do lançamento.', 'todo', member_3, now() + interval '10 days',
      null, null, null, null, 'direct', null, null, 'Preparação do piloto após decisão de integração.',
      now() - interval '3 days', now() - interval '3 days'),
    ('f0040003-0000-4000-8000-000000000024', '[SYNTHETIC W004] Rever evidência do Roadmap',
      'Itens Now sustentados por evidência recente e relações explícitas.', 'in_progress', member_1, now() + interval '3 days',
      null, null, null, null, 'direct', null, null, 'Revisão operacional semanal do Roadmap.',
      now() - interval '2 days', now() - interval '5 hours');

  insert into public.task_companies (task_id, company_id) values
    ('f0040003-0000-4000-8000-000000000001', 'f0040001-0000-4000-8000-000000000001'),
    ('f0040003-0000-4000-8000-000000000002', 'f0040001-0000-4000-8000-000000000001'),
    ('f0040003-0000-4000-8000-000000000003', 'f0040001-0000-4000-8000-000000000001'),
    ('f0040003-0000-4000-8000-000000000004', 'f0040001-0000-4000-8000-000000000002'),
    ('f0040003-0000-4000-8000-000000000005', 'f0040001-0000-4000-8000-000000000002'),
    ('f0040003-0000-4000-8000-000000000006', 'f0040001-0000-4000-8000-000000000002'),
    ('f0040003-0000-4000-8000-000000000007', 'f0040001-0000-4000-8000-000000000003'),
    ('f0040003-0000-4000-8000-000000000008', 'f0040001-0000-4000-8000-000000000003'),
    ('f0040003-0000-4000-8000-000000000009', 'f0040001-0000-4000-8000-000000000005'),
    ('f0040003-0000-4000-8000-000000000010', 'f0040001-0000-4000-8000-000000000005'),
    ('f0040003-0000-4000-8000-000000000011', 'f0040001-0000-4000-8000-000000000005'),
    ('f0040003-0000-4000-8000-000000000012', 'f0040001-0000-4000-8000-000000000004'),
    ('f0040003-0000-4000-8000-000000000013', 'f0040001-0000-4000-8000-000000000006'),
    ('f0040003-0000-4000-8000-000000000014', 'f0040001-0000-4000-8000-000000000007'),
    ('f0040003-0000-4000-8000-000000000015', 'f0040001-0000-4000-8000-000000000001'),
    ('f0040003-0000-4000-8000-000000000016', 'f0040001-0000-4000-8000-000000000002'),
    ('f0040003-0000-4000-8000-000000000017', 'f0040001-0000-4000-8000-000000000003'),
    ('f0040003-0000-4000-8000-000000000018', 'f0040001-0000-4000-8000-000000000005'),
    ('f0040003-0000-4000-8000-000000000019', 'f0040001-0000-4000-8000-000000000003'),
    ('f0040003-0000-4000-8000-000000000020', 'f0040001-0000-4000-8000-000000000005'),
    ('f0040003-0000-4000-8000-000000000021', 'f0040001-0000-4000-8000-000000000001'),
    ('f0040003-0000-4000-8000-000000000022', 'f0040001-0000-4000-8000-000000000002'),
    ('f0040003-0000-4000-8000-000000000023', 'f0040001-0000-4000-8000-000000000003');

  insert into public.task_meetings (task_id, meeting_id) values
    ('f0040003-0000-4000-8000-000000000001', 'f0040002-0000-4000-8000-000000000002'),
    ('f0040003-0000-4000-8000-000000000002', 'f0040002-0000-4000-8000-000000000002'),
    ('f0040003-0000-4000-8000-000000000003', 'f0040002-0000-4000-8000-000000000001'),
    ('f0040003-0000-4000-8000-000000000004', 'f0040002-0000-4000-8000-000000000003'),
    ('f0040003-0000-4000-8000-000000000005', 'f0040002-0000-4000-8000-000000000003'),
    ('f0040003-0000-4000-8000-000000000006', 'f0040002-0000-4000-8000-000000000003'),
    ('f0040003-0000-4000-8000-000000000007', 'f0040002-0000-4000-8000-000000000004'),
    ('f0040003-0000-4000-8000-000000000008', 'f0040002-0000-4000-8000-000000000004'),
    ('f0040003-0000-4000-8000-000000000009', 'f0040002-0000-4000-8000-000000000005'),
    ('f0040003-0000-4000-8000-000000000010', 'f0040002-0000-4000-8000-000000000005'),
    ('f0040003-0000-4000-8000-000000000018', 'f0040002-0000-4000-8000-000000000005'),
    ('f0040003-0000-4000-8000-000000000019', 'f0040002-0000-4000-8000-000000000004'),
    ('f0040003-0000-4000-8000-000000000020', 'f0040002-0000-4000-8000-000000000005'),
    ('f0040003-0000-4000-8000-000000000021', 'f0040002-0000-4000-8000-000000000002'),
    ('f0040003-0000-4000-8000-000000000013', 'f0040002-0000-4000-8000-000000000010');

  insert into public.decision_companies (decision_id, company_id) values
    ('f0040004-0000-4000-8000-000000000001', 'f0040001-0000-4000-8000-000000000001'),
    ('f0040004-0000-4000-8000-000000000002', 'f0040001-0000-4000-8000-000000000003'),
    ('f0040004-0000-4000-8000-000000000003', 'f0040001-0000-4000-8000-000000000002'),
    ('f0040004-0000-4000-8000-000000000004', 'f0040001-0000-4000-8000-000000000005'),
    ('f0040004-0000-4000-8000-000000000005', 'f0040001-0000-4000-8000-000000000002'),
    ('f0040004-0000-4000-8000-000000000006', 'f0040001-0000-4000-8000-000000000007'),
    ('f0040004-0000-4000-8000-000000000007', 'f0040001-0000-4000-8000-000000000001'),
    ('f0040004-0000-4000-8000-000000000008', 'f0040001-0000-4000-8000-000000000003'),
    ('f0040004-0000-4000-8000-000000000009', 'f0040001-0000-4000-8000-000000000002');

  insert into public.decision_meetings (decision_id, meeting_id) values
    ('f0040004-0000-4000-8000-000000000001', 'f0040002-0000-4000-8000-000000000001'),
    ('f0040004-0000-4000-8000-000000000002', 'f0040002-0000-4000-8000-000000000004'),
    ('f0040004-0000-4000-8000-000000000003', 'f0040002-0000-4000-8000-000000000003'),
    ('f0040004-0000-4000-8000-000000000004', 'f0040002-0000-4000-8000-000000000005'),
    ('f0040004-0000-4000-8000-000000000007', 'f0040002-0000-4000-8000-000000000002'),
    ('f0040004-0000-4000-8000-000000000006', 'f0040002-0000-4000-8000-000000000011');

  insert into public.decision_tasks (decision_id, task_id) values
    ('f0040004-0000-4000-8000-000000000007', 'f0040003-0000-4000-8000-000000000002'),
    ('f0040004-0000-4000-8000-000000000005', 'f0040003-0000-4000-8000-000000000004'),
    ('f0040004-0000-4000-8000-000000000009', 'f0040003-0000-4000-8000-000000000005'),
    ('f0040004-0000-4000-8000-000000000008', 'f0040003-0000-4000-8000-000000000007'),
    ('f0040004-0000-4000-8000-000000000004', 'f0040003-0000-4000-8000-000000000009'),
    ('f0040004-0000-4000-8000-000000000006', 'f0040003-0000-4000-8000-000000000014'),
    ('f0040004-0000-4000-8000-000000000008', 'f0040003-0000-4000-8000-000000000017'),
    ('f0040004-0000-4000-8000-000000000005', 'f0040003-0000-4000-8000-000000000022');

  insert into public.sprints (
    id, name, intended_result, status, owner_member_id, starts_on, ends_on,
    material_risks, actual_result, learning, created_at, updated_at
  ) values
    ('f0040005-0000-4000-8000-000000000001', '[SYNTHETIC W004] Pilot readiness',
      'Deixar Alder, Northline e Lume prontos para as próximas decisões externas.',
      'active', member_1, current_date - 3, current_date + 8,
      'Confirmação da segunda loja Alder e owner técnico Lume continuam por resolver.',
      null, null, now() - interval '4 days', now() - interval '4 hours'),
    ('f0040005-0000-4000-8000-000000000002', '[SYNTHETIC W004] Clinical validation',
      'Validar terminologia e consolidar a arquitetura Cais.',
      'planned', member_2, current_date + 9, current_date + 20,
      'Disponibilidade dos especialistas clínicos.', null, null,
      now() - interval '2 days', now() - interval '2 days'),
    ('f0040005-0000-4000-8000-000000000003', '[SYNTHETIC W004] Direction reset',
      'Escolher e prototipar as direções centrais de Alder e Northline.',
      'closed', member_2, current_date - 24, current_date - 13,
      null, 'Direção Alder escolhida e proposta Northline estruturada.',
      'Decisões explícitas reduziram retrabalho; dependências externas devem entrar mais cedo.',
      now() - interval '25 days', now() - interval '13 days'),
    ('f0040005-0000-4000-8000-000000000004', '[SYNTHETIC W004] Vale opportunity check',
      'Confirmar a janela de investimento Vale.',
      'cancelled', member_3, current_date - 10, current_date - 2,
      'A janela de investimento perdeu prioridade.', null, null,
      now() - interval '11 days', now() - interval '7 days');

  insert into public.sprint_tasks (sprint_id, task_id, committed_at, closure_disposition) values
    ('f0040005-0000-4000-8000-000000000001', 'f0040003-0000-4000-8000-000000000001', now() - interval '3 days', null),
    ('f0040005-0000-4000-8000-000000000001', 'f0040003-0000-4000-8000-000000000003', now() - interval '3 days', null),
    ('f0040005-0000-4000-8000-000000000001', 'f0040003-0000-4000-8000-000000000004', now() - interval '3 days', null),
    ('f0040005-0000-4000-8000-000000000001', 'f0040003-0000-4000-8000-000000000007', now() - interval '3 days', null),
    ('f0040005-0000-4000-8000-000000000001', 'f0040003-0000-4000-8000-000000000008', now() - interval '2 days', null),
    ('f0040005-0000-4000-8000-000000000001', 'f0040003-0000-4000-8000-000000000015', now() - interval '3 days', null),
    ('f0040005-0000-4000-8000-000000000002', 'f0040003-0000-4000-8000-000000000009', now(), null),
    ('f0040005-0000-4000-8000-000000000002', 'f0040003-0000-4000-8000-000000000010', now(), null),
    ('f0040005-0000-4000-8000-000000000002', 'f0040003-0000-4000-8000-000000000011', now(), null),
    ('f0040005-0000-4000-8000-000000000002', 'f0040003-0000-4000-8000-000000000018', now(), null),
    ('f0040005-0000-4000-8000-000000000003', 'f0040003-0000-4000-8000-000000000002', now() - interval '24 days', 'completed'),
    ('f0040005-0000-4000-8000-000000000003', 'f0040003-0000-4000-8000-000000000004', now() - interval '24 days', 'recommitted'),
    ('f0040005-0000-4000-8000-000000000003', 'f0040003-0000-4000-8000-000000000015', now() - interval '21 days', 'completed'),
    ('f0040005-0000-4000-8000-000000000003', 'f0040003-0000-4000-8000-000000000021', now() - interval '24 days', 'completed'),
    ('f0040005-0000-4000-8000-000000000004', 'f0040003-0000-4000-8000-000000000013', now() - interval '10 days', null);

  insert into public.roadmap_items (
    id, title, kind, description, evidence, horizon, lifecycle_status,
    owner_member_id, created_at, updated_at
  ) values
    ('f0040006-0000-4000-8000-000000000001', '[SYNTHETIC W004] Tornar o piloto Alder observável',
      'outcome', 'Executar o piloto com critérios claros e decisões recuperáveis.',
      'A direção está aprovada, o protótipo existe e faltam apenas dependências operacionais.',
      'now', 'active', member_1, now() - interval '16 days', now() - interval '2 hours'),
    ('f0040006-0000-4000-8000-000000000002', '[SYNTHETIC W004] Reduzir perda de contexto Northline',
      'problem', 'Diminuir repetição e perda de informação no fluxo comercial enterprise.',
      'Discovery identificou o handoff entre qualificação e demonstração como principal fricção.',
      'now', 'active', member_2, now() - interval '22 days', now() - interval '1 day'),
    ('f0040006-0000-4000-8000-000000000003', '[SYNTHETIC W004] Validar reservas Lume',
      'hypothesis', 'Um fluxo com sincronização periódica pode ser confiável se a confirmação for explícita.',
      'O fornecedor aceita atualização de quinze minutos e a decisão foi registada.',
      'now', 'active', member_3, now() - interval '5 days', now() - interval '4 hours'),
    ('f0040006-0000-4000-8000-000000000004', '[SYNTHETIC W004] Consolidar linguagem clínica Cais',
      'outcome', 'Chegar a uma arquitetura compreensível entre especialidades.',
      'Entrevistas revelaram diferenças terminológicas que precisam de teste controlado.',
      'next', 'active', member_1, now() - interval '6 days', now() - interval '1 day'),
    ('f0040006-0000-4000-8000-000000000005', '[SYNTHETIC W004] Medir efeito do handoff',
      'hypothesis', 'Um handoff único reduz tempo e repetição nas oportunidades enterprise.',
      'A decisão está tomada, mas ainda falta uma baseline operacional.',
      'next', 'active', member_2, now() - interval '8 days', now() - interval '3 days'),
    ('f0040006-0000-4000-8000-000000000006', '[SYNTHETIC W004] Reabrir relação Orbe apenas com evidência',
      'problem', 'Evitar trabalho adicional sem uma necessidade real demonstrada.',
      'A entrega terminou e a revisão trimestral ainda não revelou novo problema.',
      'later', 'active', null, now() - interval '10 days', now() - interval '5 days'),
    ('f0040006-0000-4000-8000-000000000007', '[SYNTHETIC W004] Rever oportunidade Vale',
      'hypothesis', 'Uma nova janela de investimento poderá justificar reativar a relação.',
      'A reunião foi cancelada e não existe calendário confirmado.',
      'later', 'active', null, now() - interval '9 days', now() - interval '7 days'),
    ('f0040006-0000-4000-8000-000000000008', '[SYNTHETIC W004] Direção editorial Alder',
      'outcome', 'Escolher uma direção de posicionamento clara para o piloto.',
      'Testes internos favoreceram a narrativa editorial.',
      'now', 'completed', member_2, now() - interval '24 days', now() - interval '18 days'),
    ('f0040006-0000-4000-8000-000000000009', '[SYNTHETIC W004] Integração em tempo real Lume',
      'hypothesis', 'Esperar por sincronização em tempo real reduziria risco de disponibilidade.',
      'A alternativa foi revogada quando a sincronização periódica se mostrou controlável.',
      'next', 'abandoned', member_3, now() - interval '15 days', now() - interval '5 days'),
    ('f0040006-0000-4000-8000-000000000010', '[SYNTHETIC W004] Expandir diagnóstico Fio',
      'outcome', 'Transformar o diagnóstico numa fase adicional de execução.',
      'A organização escolheu executar internamente e a relação foi encerrada.',
      'later', 'abandoned', null, now() - interval '100 days', now() - interval '90 days');

  insert into public.roadmap_item_companies (roadmap_item_id, company_id) values
    ('f0040006-0000-4000-8000-000000000001', 'f0040001-0000-4000-8000-000000000001'),
    ('f0040006-0000-4000-8000-000000000002', 'f0040001-0000-4000-8000-000000000002'),
    ('f0040006-0000-4000-8000-000000000003', 'f0040001-0000-4000-8000-000000000003'),
    ('f0040006-0000-4000-8000-000000000004', 'f0040001-0000-4000-8000-000000000005'),
    ('f0040006-0000-4000-8000-000000000005', 'f0040001-0000-4000-8000-000000000002'),
    ('f0040006-0000-4000-8000-000000000006', 'f0040001-0000-4000-8000-000000000004'),
    ('f0040006-0000-4000-8000-000000000007', 'f0040001-0000-4000-8000-000000000006'),
    ('f0040006-0000-4000-8000-000000000008', 'f0040001-0000-4000-8000-000000000001'),
    ('f0040006-0000-4000-8000-000000000009', 'f0040001-0000-4000-8000-000000000003'),
    ('f0040006-0000-4000-8000-000000000010', 'f0040001-0000-4000-8000-000000000007');

  insert into public.roadmap_item_tasks (roadmap_item_id, task_id) values
    ('f0040006-0000-4000-8000-000000000001', 'f0040003-0000-4000-8000-000000000001'),
    ('f0040006-0000-4000-8000-000000000001', 'f0040003-0000-4000-8000-000000000003'),
    ('f0040006-0000-4000-8000-000000000001', 'f0040003-0000-4000-8000-000000000015'),
    ('f0040006-0000-4000-8000-000000000002', 'f0040003-0000-4000-8000-000000000004'),
    ('f0040006-0000-4000-8000-000000000002', 'f0040003-0000-4000-8000-000000000005'),
    ('f0040006-0000-4000-8000-000000000003', 'f0040003-0000-4000-8000-000000000007'),
    ('f0040006-0000-4000-8000-000000000003', 'f0040003-0000-4000-8000-000000000008'),
    ('f0040006-0000-4000-8000-000000000004', 'f0040003-0000-4000-8000-000000000009'),
    ('f0040006-0000-4000-8000-000000000004', 'f0040003-0000-4000-8000-000000000010'),
    ('f0040006-0000-4000-8000-000000000005', 'f0040003-0000-4000-8000-000000000006'),
    ('f0040006-0000-4000-8000-000000000008', 'f0040003-0000-4000-8000-000000000002'),
    ('f0040006-0000-4000-8000-000000000009', 'f0040003-0000-4000-8000-000000000007'),
    ('f0040006-0000-4000-8000-000000000010', 'f0040003-0000-4000-8000-000000000014');

  insert into public.roadmap_item_sprints (roadmap_item_id, sprint_id) values
    ('f0040006-0000-4000-8000-000000000001', 'f0040005-0000-4000-8000-000000000001'),
    ('f0040006-0000-4000-8000-000000000002', 'f0040005-0000-4000-8000-000000000001'),
    ('f0040006-0000-4000-8000-000000000003', 'f0040005-0000-4000-8000-000000000001'),
    ('f0040006-0000-4000-8000-000000000004', 'f0040005-0000-4000-8000-000000000002'),
    ('f0040006-0000-4000-8000-000000000008', 'f0040005-0000-4000-8000-000000000003');

  insert into public.roadmap_item_decisions (roadmap_item_id, decision_id) values
    ('f0040006-0000-4000-8000-000000000001', 'f0040004-0000-4000-8000-000000000007'),
    ('f0040006-0000-4000-8000-000000000002', 'f0040004-0000-4000-8000-000000000009'),
    ('f0040006-0000-4000-8000-000000000003', 'f0040004-0000-4000-8000-000000000008'),
    ('f0040006-0000-4000-8000-000000000004', 'f0040004-0000-4000-8000-000000000004'),
    ('f0040006-0000-4000-8000-000000000005', 'f0040004-0000-4000-8000-000000000003'),
    ('f0040006-0000-4000-8000-000000000008', 'f0040004-0000-4000-8000-000000000007'),
    ('f0040006-0000-4000-8000-000000000009', 'f0040004-0000-4000-8000-000000000008'),
    ('f0040006-0000-4000-8000-000000000010', 'f0040004-0000-4000-8000-000000000006');
end;
$synthetic_w004$;

commit;
