// Backend local autónomo do Vouga OS.
//
// Implementa a MESMA interface do cliente Supabase (auth + from() + storage),
// mas guarda tudo em localStorage e aceita um único login: admin@vouga.com.
// O front-end não sabe a diferença. Quando quiseres ligar o Supabase real,
// substitui este ficheiro pelo createClient e mantém o resto igual.

const ADMIN = { email: "admin@vouga.com", password: "vouga123" };

type Row = Record<string, any>;
const isBrowser = typeof window !== "undefined";
const KEY = (t: string) => `vouga.db.${t}`;

function read(table: string): Row[] {
  if (!isBrowser) return [];
  try { return JSON.parse(localStorage.getItem(KEY(table)) || "[]"); } catch { return []; }
}
function write(table: string, rows: Row[]) {
  if (isBrowser) localStorage.setItem(KEY(table), JSON.stringify(rows));
}

type Filter = [string, "eq" | "neq" | "in" | "gte" | "lte" | "is", any];

class Query {
  private filters: Filter[] = [];
  private orders: [string, boolean][] = [];
  private limitN?: number;
  private mode: "select" | "insert" | "update" | "delete" = "select";
  private payload: any;
  private wantSingle = false;
  private wantMaybe = false;
  private head = false;
  private doCount = false;
  constructor(private table: string) {}

  select(_cols?: string, opts?: { count?: string; head?: boolean }) {
    if (opts?.count) this.doCount = true;
    if (opts?.head) this.head = true;
    return this;
  }
  insert(p: any) { this.mode = "insert"; this.payload = p; return this; }
  update(p: any) { this.mode = "update"; this.payload = p; return this; }
  delete() { this.mode = "delete"; return this; }
  eq(c: string, v: any) { this.filters.push([c, "eq", v]); return this; }
  neq(c: string, v: any) { this.filters.push([c, "neq", v]); return this; }
  in(c: string, v: any[]) { this.filters.push([c, "in", v]); return this; }
  gte(c: string, v: any) { this.filters.push([c, "gte", v]); return this; }
  lte(c: string, v: any) { this.filters.push([c, "lte", v]); return this; }
  is(c: string, v: any) { this.filters.push([c, "is", v]); return this; }
  order(c: string, opts?: { ascending?: boolean }) { this.orders.push([c, opts?.ascending !== false]); return this; }
  limit(n: number) { this.limitN = n; return this; }
  single() { this.wantSingle = true; return this; }
  maybeSingle() { this.wantMaybe = true; return this; }

  private match(r: Row) {
    return this.filters.every(([c, op, v]) => {
      const x = r[c];
      switch (op) {
        case "eq": return x === v;
        case "neq": return x !== v;
        case "in": return Array.isArray(v) && v.includes(x);
        case "gte": return x >= v;
        case "lte": return x <= v;
        case "is": return v === null ? x === null || x === undefined : x === v;
      }
    });
  }

  private run() {
    let rows = read(this.table);
    if (this.mode === "insert") {
      const items = Array.isArray(this.payload) ? this.payload : [this.payload];
      const now = new Date().toISOString();
      const created = items.map((it: Row) => ({ id: crypto.randomUUID(), created_at: now, updated_at: now, ...it }));
      write(this.table, rows.concat(created));
      return { data: this.wantSingle ? created[0] : created, error: null };
    }
    if (this.mode === "update") {
      const now = new Date().toISOString();
      write(this.table, rows.map((r) => (this.match(r) ? { ...r, ...this.payload, updated_at: now } : r)));
      return { data: null, error: null };
    }
    if (this.mode === "delete") {
      write(this.table, rows.filter((r) => !this.match(r)));
      return { data: null, error: null };
    }
    let res = rows.filter((r) => this.match(r));
    for (let i = this.orders.length - 1; i >= 0; i--) {
      const [c, asc] = this.orders[i];
      res = [...res].sort((a, b) => (a[c] < b[c] ? (asc ? -1 : 1) : a[c] > b[c] ? (asc ? 1 : -1) : 0));
    }
    if (this.limitN != null) res = res.slice(0, this.limitN);
    if (this.doCount) return { data: this.head ? null : res, count: res.length, error: null };
    if (this.wantSingle) return { data: res[0] ?? null, error: res[0] ? null : { message: "No rows" } };
    if (this.wantMaybe) return { data: res[0] ?? null, error: null };
    return { data: res, error: null };
  }

  then(resolve: (v: any) => void, reject?: (e: any) => void) {
    try { resolve(this.run()); } catch (e) { reject ? reject(e) : resolve({ data: null, error: e }); }
  }
}

// ---- auth ----
type Listener = (event: string, session: any) => void;
let listeners: Listener[] = [];

function getSession() {
  if (!isBrowser) return null;
  try { return JSON.parse(localStorage.getItem("vouga.session") || "null"); } catch { return null; }
}
function setSession(s: any) {
  if (isBrowser) { s ? localStorage.setItem("vouga.session", JSON.stringify(s)) : localStorage.removeItem("vouga.session"); }
  listeners.forEach((cb) => cb(s ? "SIGNED_IN" : "SIGNED_OUT", s));
}
function seedAdmin() {
  write("profiles", [{ id: "admin", full_name: "Admin Vouga", email: ADMIN.email, onboarded_at: null, gender: "male" }]);
  write("user_roles", [{ user_id: "admin", role: "admin" }]);

  // Seed sprint + tarefas + milestones se ainda não existirem
  if (read("sprints").length === 0) {
    const SPRINT_ID = crypto.randomUUID();
    const now = new Date().toISOString();

    write("sprints", [{
      id: SPRINT_ID, name: "Sprint 25/05",
      starts_on: "2026-05-25", ends_on: "2026-06-07",
      created_at: now, updated_at: now,
    }]);

    const TASKS = [
      { title: "Organizar e comprar primeiras subscrições (Claude, etc.)", assignee_name: "Miguel",  priority: "medium",    status: "todo" },
      { title: "Reunião com Andreia Gama no ISEP (Vouga Academy + ISEP Start)", assignee_name: "Roque",   priority: "important", status: "todo" },
      { title: "Criar redes sociais da Vouga",              assignee_name: "Inês",   priority: "medium",    status: "todo" },
      { title: "Comprar domínio para o site da Vouga",      assignee_name: "Roque",  priority: "urgent",    status: "todo" },
      { title: "Comprar domínio para email da Vouga",       assignee_name: "Roque",  priority: "urgent",    status: "todo" },
      { title: "Melhorar o diagnóstico do site",            assignee_name: "Inês",   priority: "important", status: "todo" },
      { title: "Footer do site com dados reais",            assignee_name: "Miguel", priority: "medium",    status: "todo" },
      { title: "Colocar base de dados no site",             assignee_name: "Miguel", priority: "important", status: "todo" },
      { title: "Colocar use cases no site",                 assignee_name: "Miguel", priority: "important", status: "todo" },
    ];
    write("tasks", TASKS.map(t => ({ id: crypto.randomUUID(), sprint_id: SPRINT_ID, description: "", effort: null, created_at: now, updated_at: now, ...t })));
  }

  if (read("roadmap_items").length === 0) {
    const now = new Date().toISOString();
    const MS = [
      { title: "M1 · Empresa constituída e a faturar",      target_date: "2026-07-31",
        description: "Concluído quando: sociedade registada, conta bancária aberta e software de faturação ativo, pronto a emitir a primeira fatura." },
      { title: "M2 · Oferta de entrada trancada",           target_date: "2026-07-18",
        description: "Concluído quando: o diagnóstico está definido como produto, com escopo, preço e entregável, e a escada sprint, piloto e parceiro está num one pager comercial." },
      { title: "M3 · Site no domínio próprio",              target_date: "2026-07-05",
        description: "Concluído quando: vouga.agency no ar, uma língua coerente, dados reais no rodapé e zero placeholders." },
      { title: "M4 · Pipeline inicial",                     target_date: "2026-07-15",
        description: "Concluído quando: lista de 25 a 30 empresas alvo no EDV com contacto e caminho identificado, e 10 conversas reais realizadas." },
      { title: "M5 · Primeiro cliente pago",                target_date: "2026-07-31",
        description: "Concluído quando: proposta assinada e primeira fatura emitida." },
      { title: "M6 · Tração que sustenta a equipa",         target_date: "2026-08-31",
        description: "Concluído quando: 2 ou mais clientes pagos assinados, cash recebido de pelo menos um, e uma conversa de parceiro recorrente ativa, na ordem dos 6 a 12 mil euros contratados." },
      { title: "M7 · Primeiro contacto formal com o ISEP",  target_date: "2026-09-15",
        description: "Concluído quando: reunião feita com pessoa nomeada do outro lado e próximo passo concreto acordado, bolsa ou protocolo." },
      { title: "M8 · Receita previsível",                   target_date: "2027-03-31",
        description: "Concluído quando: 3 a 5 clientes pagos, com 1 ou 2 em parceiro recorrente e mensalidade ativa." },
      { title: "M9 · Primeiro caso de estudo real",         target_date: "2027-04-30",
        description: "Concluído quando: um caso publicado com métricas verdadeiras, validadas pelo cliente." },
      { title: "M10 · Break-even operacional",              target_date: "2027-06-30",
        description: "Concluído quando: a receita cobre custos e o chão dos fundadores durante três meses seguidos." },
      { title: "M11 · Primeira contratação",                target_date: "2027-07-31",
        description: "Concluído quando: um builder core ou freelancer convertido, pago por receita." },
      { title: "M12 · Vertical productizado",               target_date: "2027-09-30",
        description: "Concluído quando: um vertical com oferta repetível, escopo, preço e playbook, e dois ou mais clientes nesse vertical." },
      { title: "M13 · Academy em piloto",                   target_date: "2027-09-30",
        description: "Concluído quando: uma bolsa ou projeto com o ISEP a decorrer com aluno." },
      { title: "M14 · Equipa e ownership",                  target_date: "2028-06-30",
        description: "Concluído quando: 5 a 8 pessoas, modelo de participação a funcionar e pelo menos uma pessoa a vestar." },
      { title: "M15 · Foundations real",                    target_date: "2028-12-31",
        description: "Concluído quando: um produto próprio ou projeto académico graduado em construção ou lançado." },
      { title: "M16 · Referência regional no EDV",          target_date: "2029-12-31",
        description: "Concluído quando: inbound consistente e reconhecimento através de eventos e parcerias." },
    ];
    write("roadmap_items", MS.map(m => ({ id: crypto.randomUUID(), kind: "milestone", status: "pending", created_at: now, updated_at: now, ...m })));
  }

  // Seed pipeline comercial de demonstração (EDV) se ainda não existir
  if (read("commercial_institutions").length === 0) {
    const now = new Date().toISOString();
    const day = (n: number) => { const d = new Date(); d.setDate(d.getDate() + n); d.setHours(9, 0, 0, 0); return d.toISOString(); };

    type Seed = {
      nome: string; setor: string; localizacao: string; vertical: string;
      origem: string; responsavel: string; estagio: string; valor_estimado: number;
      proximo_passo: string | null; proximo_passo_data: string | null; motivo_saida?: string | null;
    };
    const EMP: Seed[] = [
      { nome: "Moldes Antuã",          setor: "Moldes",            localizacao: "Oliveira de Azeméis",  vertical: "quote",       origem: "Rede",       responsavel: "Miguel", estagio: "alvo",        valor_estimado: 9000,  proximo_passo: null, proximo_passo_data: null },
      { nome: "PrecisionAZ CNC",       setor: "Maquinação CNC",    localizacao: "Oliveira de Azeméis",  vertical: "quote",       origem: "LinkedIn",   responsavel: "Roque",  estagio: "alvo",        valor_estimado: 7500,  proximo_passo: "Identificar decisor no LinkedIn", proximo_passo_data: day(1) },
      { nome: "Inox Feira",            setor: "Inox",              localizacao: "Santa Maria da Feira", vertical: "maintenance", origem: "Evento",     responsavel: "Inês",   estagio: "alvo",        valor_estimado: 6000,  proximo_passo: null, proximo_passo_data: null },
      { nome: "Metalúrgica Caima",     setor: "Metalomecânica",    localizacao: "Vale de Cambra",       vertical: "maintenance", origem: "Outbound",   responsavel: "Miguel", estagio: "contactado",  valor_estimado: 8000,  proximo_passo: "Follow-up ao 1º email", proximo_passo_data: day(-1) },
      { nome: "Ferragens Argoncilhe",  setor: "Ferragens",         localizacao: "Santa Maria da Feira", vertical: "quote",       origem: "Outbound",   responsavel: "Roque",  estagio: "contactado",  valor_estimado: 7000,  proximo_passo: "Segundo toque por telefone", proximo_passo_data: day(2) },
      { nome: "Componentes Arrifana",  setor: "Componentes auto",  localizacao: "S. João da Madeira",   vertical: "quote",       origem: "Referência", responsavel: "Inês",   estagio: "contactado",  valor_estimado: 12000, proximo_passo: "Reenviar proposta de conversa", proximo_passo_data: day(0) },
      { nome: "Plásticos Ul",          setor: "Injeção plástica",  localizacao: "Oliveira de Azeméis",  vertical: "quality",     origem: "Rede",       responsavel: "Miguel", estagio: "em_conversa", valor_estimado: 10000, proximo_passo: "Marcar discovery", proximo_passo_data: day(1) },
      { nome: "CortiçArte",            setor: "Cortiça",           localizacao: "Santa Maria da Feira", vertical: "quality",     origem: "Evento",     responsavel: "Roque",  estagio: "em_conversa", valor_estimado: 8500,  proximo_passo: "Enviar casos de uso", proximo_passo_data: day(-2) },
      { nome: "EuroMoldes Cambra",     setor: "Moldes",            localizacao: "Vale de Cambra",       vertical: "quote",       origem: "Rede",       responsavel: "Miguel", estagio: "discovery",   valor_estimado: 14000, proximo_passo: "Discovery agendada quinta", proximo_passo_data: day(3) },
      { nome: "ToolingPro Fiães",      setor: "Moldes",            localizacao: "Santa Maria da Feira", vertical: "quote",       origem: "Referência", responsavel: "Inês",   estagio: "discovery",   valor_estimado: 16000, proximo_passo: "Recolher dados do processo de quote", proximo_passo_data: day(2) },
      { nome: "MetalDouro",            setor: "Metalomecânica",    localizacao: "Oliveira de Azeméis",  vertical: "maintenance", origem: "Outbound",   responsavel: "Roque",  estagio: "proposta",    valor_estimado: 12000, proximo_passo: "Apresentar proposta de Sprint", proximo_passo_data: day(1) },
      { nome: "CalçadoTech",           setor: "Calçado",           localizacao: "S. João da Madeira",   vertical: "quality",     origem: "Rede",       responsavel: "Miguel", estagio: "proposta",    valor_estimado: 9000,  proximo_passo: "Aguardar decisão até sexta", proximo_passo_data: day(4) },
      { nome: "AutoPeças Vouga",       setor: "Componentes auto",  localizacao: "Albergaria-a-Velha",   vertical: "quote",       origem: "Referência", responsavel: "Roque",  estagio: "ganho",       valor_estimado: 11000, proximo_passo: null, proximo_passo_data: null },
      { nome: "Têxtil Cambra",         setor: "Têxtil técnico",    localizacao: "Vale de Cambra",       vertical: "quality",     origem: "Outbound",   responsavel: "Inês",   estagio: "perdido",     valor_estimado: 6000,  proximo_passo: null, proximo_passo_data: null, motivo_saida: "Sem budget este ano." },
      { nome: "Cerâmica Aveiro",       setor: "Cerâmica",          localizacao: "Aveiro",               vertical: "maintenance", origem: "Evento",     responsavel: "Miguel", estagio: "adormecido",  valor_estimado: 8000,  proximo_passo: null, proximo_passo_data: null, motivo_saida: "Retomar no Q4." },
    ];

    const empresas = EMP.map((e) => ({
      id: crypto.randomUUID(),
      ...e,
      dimensao: null,
      motivo_saida: e.motivo_saida ?? null,
      notas: null,
      created_at: now,
      updated_at: now,
    }));
    write("commercial_institutions", empresas);

    const byName = (n: string) => empresas.find((e) => e.nome === n)!.id;
    const act = (nome: string, tipo: string, resultado: string, n: number, nota: string | null) => ({
      id: crypto.randomUUID(), empresa_id: byName(nome), institution_id: byName(nome),
      contacto_id: null, tipo, type: tipo, resultado, nota, note: nota,
      data: day(n), acted_on: day(n), created_at: now,
    });
    write("commercial_actions", [
      act("Metalúrgica Caima", "email", "respondeu", -1, "Mostrou interesse, pediu mais info."),
      act("Metalúrgica Caima", "email", "sem_resposta", -4, "1º email enviado."),
      act("Ferragens Argoncilhe", "email", "sem_resposta", -2, "Outreach inicial."),
      act("Componentes Arrifana", "linkedin", "respondeu", -1, "Aberto a uma call."),
      act("Plásticos Ul", "chamada", "respondeu", -2, "Boa conversa, querem perceber escopo."),
      act("Plásticos Ul", "email", "respondeu", -3, "Resposta rápida."),
      act("CortiçArte", "cafe", "reuniao_marcada", -2, "Café marcado para a semana."),
      act("EuroMoldes Cambra", "reuniao", "reuniao_marcada", -1, "Discovery agendada."),
      act("ToolingPro Fiães", "linkedin", "respondeu", -2, "Pediram proposta."),
      act("MetalDouro", "reuniao", "reuniao_marcada", -3, "Discovery feita, há dor real."),
      act("CalçadoTech", "email", "respondeu", -2, "A analisar internamente."),
      act("AutoPeças Vouga", "reuniao", "reuniao_marcada", -8, "Fechado, Sprint a arrancar."),
      act("PrecisionAZ CNC", "linkedin", "sem_resposta", 0, "Pedido de ligação."),
      act("Inox Feira", "email", "sem_resposta", -1, "Primeiro contacto."),
    ]);

    write("commercial_contacts", [
      { id: crypto.randomUUID(), empresa_id: byName("EuroMoldes Cambra"), nome: "João Tavares", cargo: "Diretor de produção", email: "joao@euromoldes.pt", telefone: "256 000 000", linkedin: null, created_at: now },
      { id: crypto.randomUUID(), empresa_id: byName("MetalDouro"), nome: "Sofia Brandão", cargo: "CEO", email: "sofia@metaldouro.pt", telefone: null, linkedin: null, created_at: now },
      { id: crypto.randomUUID(), empresa_id: byName("Plásticos Ul"), nome: "Rui Pinho", cargo: "Responsável de orçamentação", email: "rui@plasticosul.pt", telefone: null, linkedin: null, created_at: now },
    ]);
  }
}

const auth = {
  async getSession() { return { data: { session: getSession() }, error: null }; },
  async getUser() { const s = getSession(); return { data: { user: s?.user ?? null }, error: null }; },
  onAuthStateChange(cb: Listener) {
    listeners.push(cb);
    return { data: { subscription: { unsubscribe() { listeners = listeners.filter((l) => l !== cb); } } } };
  },
  async signInWithPassword({ email, password }: { email: string; password: string }) {
    if (email?.trim().toLowerCase() === ADMIN.email && password === ADMIN.password) {
      seedAdmin();
      const session = { access_token: "local", user: { id: "admin", email: ADMIN.email } };
      setSession(session);
      return { data: { session, user: session.user }, error: null };
    }
    return { data: { session: null, user: null }, error: { message: "Credenciais inválidas." } };
  },
  async signOut() { setSession(null); return { error: null }; },
  async updateUser() { return { data: { user: getSession()?.user ?? null }, error: null }; },
};

const storage = {
  from(_bucket: string) {
    return {
      async upload(path: string, _file: any) { return { data: { path }, error: null }; },
      async createSignedUrl(_path: string) { return { data: { signedUrl: "#" }, error: null }; },
      async remove(_paths: string[]) { return { data: null, error: null }; },
    };
  },
};

export const supabase = {
  auth,
  from: (table: string) => new Query(table),
  storage,
} as any;
