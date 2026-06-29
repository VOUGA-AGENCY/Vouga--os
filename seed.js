// Seed Vouga OS — colar no console do browser depois de fazer login
// Cria sprint 25/05, 9 tarefas, e 16 milestones no roadmap.

(function seed() {
  const KEY = (t) => `vouga.db.${t}`;
  const read = (t) => { try { return JSON.parse(localStorage.getItem(KEY(t)) || "[]"); } catch { return []; } };
  const write = (t, rows) => localStorage.setItem(KEY(t), JSON.stringify(rows));
  const uuid = () => crypto.randomUUID();
  const now = () => new Date().toISOString();

  // ── 1. Sprint ────────────────────────────────────────────────────────────────
  const SPRINT_ID = uuid();
  const sprint = {
    id: SPRINT_ID,
    name: "Sprint 25/05",
    starts_on: "2026-05-25",
    ends_on: "2026-06-07",
    created_at: now(),
    updated_at: now(),
  };
  const existingSprints = read("sprints").filter(s => s.name !== "Sprint 25/05");
  write("sprints", [...existingSprints, sprint]);
  console.log("✅ Sprint criada:", sprint.name);

  // ── 2. Tarefas ───────────────────────────────────────────────────────────────
  const TASKS = [
    { title: "Organizar e comprar primeiras subscrições (Claude, etc.)", assignee_name: "Miguel",  priority: "medium",    status: "todo" },
    { title: "Reunião com Andreia Gama no ISEP (Vouga Academy + ISEP Start)", assignee_name: "Roque",   priority: "important", status: "todo" },
    { title: "Criar redes sociais da Vouga",                             assignee_name: "Inês",   priority: "medium",    status: "todo" },
    { title: "Comprar domínio para o site da Vouga",                    assignee_name: "Roque",   priority: "urgent",    status: "todo" },
    { title: "Comprar domínio para email da Vouga",                     assignee_name: "Roque",   priority: "urgent",    status: "todo" },
    { title: "Melhorar o diagnóstico do site",                          assignee_name: "Inês",   priority: "important", status: "todo" },
    { title: "Footer do site com dados reais",                          assignee_name: "Miguel",  priority: "medium",    status: "todo" },
    { title: "Colocar base de dados no site",                           assignee_name: "Miguel",  priority: "important", status: "todo" },
    { title: "Colocar use cases no site",                               assignee_name: "Miguel",  priority: "important", status: "todo" },
  ];

  const existingTasks = read("tasks");
  const existingTitles = new Set(existingTasks.map(t => t.title));
  const newTasks = TASKS
    .filter(t => !existingTitles.has(t.title))
    .map(t => ({ id: uuid(), sprint_id: SPRINT_ID, description: "", effort: null, created_at: now(), updated_at: now(), ...t }));

  write("tasks", [...existingTasks, ...newTasks]);
  console.log(`✅ ${newTasks.length} tarefa(s) inserida(s)`);

  // ── 3. Milestones ─────────────────────────────────────────────────────────────
  const MILESTONES = [
    { title: "M1 · Empresa constituída e a faturar",   target_date: "2026-07-31", status: "pending",
      description: "Concluído quando: sociedade registada, conta bancária aberta e software de faturação ativo, pronto a emitir a primeira fatura." },
    { title: "M2 · Oferta de entrada trancada",        target_date: "2026-07-18", status: "pending",
      description: "Concluído quando: o diagnóstico está definido como produto, com escopo, preço e entregável, e a escada sprint, piloto e parceiro está num one pager comercial." },
    { title: "M3 · Site no domínio próprio",           target_date: "2026-07-05", status: "pending",
      description: "Concluído quando: vouga.agency no ar, uma língua coerente, dados reais no rodapé e zero placeholders." },
    { title: "M4 · Pipeline inicial",                  target_date: "2026-07-15", status: "pending",
      description: "Concluído quando: lista de 25 a 30 empresas alvo no EDV com contacto e caminho identificado, e 10 conversas reais realizadas." },
    { title: "M5 · Primeiro cliente pago",             target_date: "2026-07-31", status: "pending",
      description: "Concluído quando: proposta assinada e primeira fatura emitida." },
    { title: "M6 · Tração que sustenta a equipa",      target_date: "2026-08-31", status: "pending",
      description: "Concluído quando: 2 ou mais clientes pagos assinados, cash recebido de pelo menos um, e uma conversa de parceiro recorrente ativa, na ordem dos 6 a 12 mil euros contratados." },
    { title: "M7 · Primeiro contacto formal com o ISEP", target_date: "2026-09-15", status: "pending",
      description: "Concluído quando: reunião feita com pessoa nomeada do outro lado e próximo passo concreto acordado, bolsa ou protocolo." },
    { title: "M8 · Receita previsível",                target_date: "2027-03-31", status: "pending",
      description: "Concluído quando: 3 a 5 clientes pagos, com 1 ou 2 em parceiro recorrente e mensalidade ativa." },
    { title: "M9 · Primeiro caso de estudo real",      target_date: "2027-04-30", status: "pending",
      description: "Concluído quando: um caso publicado com métricas verdadeiras, validadas pelo cliente." },
    { title: "M10 · Break-even operacional",           target_date: "2027-06-30", status: "pending",
      description: "Concluído quando: a receita cobre custos e o chão dos fundadores durante três meses seguidos." },
    { title: "M11 · Primeira contratação",             target_date: "2027-07-31", status: "pending",
      description: "Concluído quando: um builder core ou freelancer convertido, pago por receita." },
    { title: "M12 · Vertical productizado",            target_date: "2027-09-30", status: "pending",
      description: "Concluído quando: um vertical com oferta repetível, escopo, preço e playbook, e dois ou mais clientes nesse vertical." },
    { title: "M13 · Academy em piloto",                target_date: "2027-09-30", status: "pending",
      description: "Concluído quando: uma bolsa ou projeto com o ISEP a decorrer com aluno." },
    { title: "M14 · Equipa e ownership",               target_date: "2028-06-30", status: "pending",
      description: "Concluído quando: 5 a 8 pessoas, modelo de participação a funcionar e pelo menos uma pessoa a vestar." },
    { title: "M15 · Foundations real",                 target_date: "2028-12-31", status: "pending",
      description: "Concluído quando: um produto próprio ou projeto académico graduado em construção ou lançado." },
    { title: "M16 · Referência regional no EDV",       target_date: "2029-12-31", status: "pending",
      description: "Concluído quando: inbound consistente e reconhecimento através de eventos e parcerias." },
  ];

  const existingItems = read("roadmap_items");
  const existingMsTitles = new Set(existingItems.map(m => m.title));
  const newMs = MILESTONES
    .filter(m => !existingMsTitles.has(m.title))
    .map(m => ({ id: uuid(), kind: "milestone", created_at: now(), updated_at: now(), ...m }));

  write("roadmap_items", [...existingItems, ...newMs]);
  console.log(`✅ ${newMs.length} milestone(s) inserida(s)`);

  console.log("🚀 Seed completo — refresca a página para ver os dados.");
})();
