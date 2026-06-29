import { sb } from "./sb";
import type {
  Atividade,
  Contacto,
  Empresa,
  EmpresaEstagio,
  EmpresaVertical,
  Lead,
  LeadAction,
} from "./types";

const LEAD_COLS = "id,name,status,location,focus,contacts,responsaveis,notes,next_action_at";
const EMPRESA_COLS =
  "id,nome,setor,localizacao,dimensao,vertical,origem,responsavel,estagio,valor_estimado,proximo_passo,proximo_passo_data,motivo_saida,notas,created_at,updated_at";
const CONTACTO_COLS = "id,empresa_id,nome,cargo,email,telefone,linkedin,created_at";
const ATIVIDADE_COLS = "id,empresa_id,contacto_id,tipo,data,resultado,nota";

export type ActivityCounts = { email: number; linkedin: number; chamada: number; cafe: number; visita: number; reuniao: number };
export type Goals = { goal_email: number; goal_linkedin: number; goal_chamada: number; goal_cafe: number; goal_visita: number; goal_reuniao: number };

type EmpresaInput = {
  nome: string;
  setor?: string | null;
  localizacao?: string | null;
  dimensao?: string | null;
  vertical?: EmpresaVertical | null;
  origem?: string | null;
  responsavel?: string | null;
  estagio?: EmpresaEstagio;
  valor_estimado?: number | null;
  proximo_passo?: string | null;
  proximo_passo_data?: string | null;
  motivo_saida?: string | null;
  notas?: string | null;
};

type ContactoInput = {
  empresa_id: string;
  nome: string;
  cargo?: string | null;
  email?: string | null;
  telefone?: string | null;
  linkedin?: string | null;
};

type AtividadeInput = {
  empresa_id: string;
  contacto_id?: string | null;
  tipo: Atividade["tipo"];
  data?: string;
  resultado: Atividade["resultado"];
  nota?: string | null;
};

const LEGACY_STAGE: Record<string, EmpresaEstagio> = {
  por_enviar: "alvo",
  enviado: "contactado",
  agendado: "proposta",
  acordado: "ganho",
};

function startOfWeekISO() {
  const d = new Date();
  const day = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

function asNull(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function normalizeEmpresa(row: any): Empresa {
  return {
    id: row.id,
    nome: row.nome ?? row.name ?? "Empresa sem nome",
    setor: row.setor ?? null,
    localizacao: row.localizacao ?? row.location ?? null,
    dimensao: row.dimensao ?? null,
    vertical: row.vertical ?? null,
    origem: row.origem ?? null,
    responsavel: row.responsavel ?? row.responsaveis ?? null,
    estagio: row.estagio ?? LEGACY_STAGE[row.status] ?? "alvo",
    valor_estimado: typeof row.valor_estimado === "number" ? row.valor_estimado : null,
    proximo_passo: row.proximo_passo ?? null,
    proximo_passo_data: row.proximo_passo_data ?? row.next_action_at ?? null,
    motivo_saida: row.motivo_saida ?? null,
    notas: row.notas ?? row.notes ?? null,
    created_at: row.created_at ?? new Date().toISOString(),
    updated_at: row.updated_at ?? row.created_at ?? new Date().toISOString(),
  };
}

function normalizeAtividade(row: any): Atividade {
  return {
    id: row.id,
    empresa_id: row.empresa_id ?? row.institution_id,
    contacto_id: row.contacto_id ?? null,
    tipo: row.tipo ?? (row.type === "sms_linkedin" ? "linkedin" : row.type) ?? "email",
    data: row.data ?? row.acted_on ?? row.created_at ?? new Date().toISOString(),
    resultado: row.resultado ?? "sem_resposta",
    nota: row.nota ?? row.note ?? null,
  };
}

export const crm = {
  async listEmpresas(): Promise<Empresa[]> {
    const { data, error } = await sb
      .from("commercial_institutions")
      .select(EMPRESA_COLS)
      .order("updated_at", { ascending: false });
    if (error) throw error;
    return (data ?? []).map(normalizeEmpresa);
  },

  async createEmpresa(input: EmpresaInput): Promise<void> {
    const { error } = await sb.from("commercial_institutions").insert({
      nome: input.nome,
      setor: asNull(input.setor),
      localizacao: asNull(input.localizacao),
      dimensao: asNull(input.dimensao),
      vertical: input.vertical ?? null,
      origem: asNull(input.origem),
      responsavel: asNull(input.responsavel),
      estagio: input.estagio ?? "alvo",
      valor_estimado: input.valor_estimado ?? null,
      proximo_passo: asNull(input.proximo_passo),
      proximo_passo_data: input.proximo_passo_data ?? null,
      motivo_saida: asNull(input.motivo_saida),
      notas: asNull(input.notas),
    });
    if (error) throw error;
  },

  async updateEmpresa(id: string, patch: Partial<EmpresaInput>): Promise<void> {
    const payload: Record<string, unknown> = { ...patch, updated_at: new Date().toISOString() };
    for (const key of ["setor", "localizacao", "dimensao", "origem", "responsavel", "proximo_passo", "motivo_saida", "notas"]) {
      if (key in payload) payload[key] = asNull(payload[key]);
    }
    const { error } = await sb.from("commercial_institutions").update(payload).eq("id", id);
    if (error) throw error;
  },

  async listContactos(empresaId?: string): Promise<Contacto[]> {
    let q = sb.from("commercial_contacts").select(CONTACTO_COLS).order("created_at", { ascending: false });
    if (empresaId) q = q.eq("empresa_id", empresaId);
    const { data, error } = await q;
    if (error) throw error;
    return (data ?? []) as Contacto[];
  },

  async createContacto(input: ContactoInput): Promise<void> {
    const { error } = await sb.from("commercial_contacts").insert({
      empresa_id: input.empresa_id,
      nome: input.nome,
      cargo: asNull(input.cargo),
      email: asNull(input.email),
      telefone: asNull(input.telefone),
      linkedin: asNull(input.linkedin),
    });
    if (error) throw error;
  },

  async listAtividades(empresaId?: string): Promise<Atividade[]> {
    const { data, error } = await sb.from("commercial_actions").select(ATIVIDADE_COLS).order("data", { ascending: false });
    if (error) throw error;
    const atividades = (data ?? []).map(normalizeAtividade);
    return empresaId ? atividades.filter((atividade: Atividade) => atividade.empresa_id === empresaId) : atividades;
  },

  async createAtividade(input: AtividadeInput): Promise<void> {
    const data = input.data ?? new Date().toISOString();
    const { error } = await sb.from("commercial_actions").insert({
      empresa_id: input.empresa_id,
      institution_id: input.empresa_id,
      contacto_id: input.contacto_id ?? null,
      tipo: input.tipo,
      type: input.tipo,
      data,
      acted_on: data,
      resultado: input.resultado,
      nota: asNull(input.nota),
      note: asNull(input.nota),
    });
    if (error) throw error;
  },

  async weeklyActivity(): Promise<ActivityCounts> {
    const { data, error } = await sb.from("commercial_actions").select("tipo,type,data,acted_on").gte("data", startOfWeekISO());
    if (error) throw error;
    const counts: ActivityCounts = { email: 0, linkedin: 0, chamada: 0, cafe: 0, visita: 0, reuniao: 0 };
    (data ?? []).forEach((a: any) => {
      const tipo = a.tipo ?? (a.type === "sms_linkedin" ? "linkedin" : a.type);
      if (tipo in counts) (counts as any)[tipo]++;
    });
    return counts;
  },

  async goals(): Promise<Goals> {
    const { data } = await sb.from("commercial_goals").select("*").limit(1).maybeSingle();
    return (
      data ?? { goal_email: 15, goal_linkedin: 10, goal_chamada: 6, goal_cafe: 2, goal_visita: 1, goal_reuniao: 2 }
    );
  },

  // Compatibilidade com a primeira versão da página de CRM.
  async listLeads(): Promise<Lead[]> {
    const { data, error } = await sb
      .from("commercial_institutions")
      .select(LEAD_COLS)
      .order("updated_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as Lead[];
  },

  async createLead(input: { name: string; location?: string | null; focus?: string | null; responsaveis?: string | null }): Promise<void> {
    await crm.createEmpresa({
      nome: input.name,
      localizacao: input.location ?? null,
      setor: input.focus ?? null,
      responsavel: input.responsaveis ?? null,
    });
  },

  async updateLead(id: string, patch: Partial<Pick<Lead, "status" | "next_action_at" | "notes" | "location" | "focus" | "responsaveis" | "contacts">> & { last_contact_at?: string }): Promise<void> {
    const mapped: Partial<EmpresaInput> = {};
    if (patch.status) mapped.estagio = LEGACY_STAGE[patch.status] ?? "alvo";
    if ("next_action_at" in patch) mapped.proximo_passo_data = patch.next_action_at ?? null;
    if ("notes" in patch) mapped.notas = patch.notes ?? null;
    if ("location" in patch) mapped.localizacao = patch.location ?? null;
    if ("focus" in patch) mapped.setor = patch.focus ?? null;
    if ("responsaveis" in patch) mapped.responsavel = patch.responsaveis ?? null;
    await crm.updateEmpresa(id, mapped);
  },

  async listActions(leadId: string): Promise<LeadAction[]> {
    const actions = await crm.listAtividades(leadId);
    return actions.map((a) => ({ id: a.id, type: a.tipo, note: a.nota, acted_on: a.data }));
  },

  async addAction(leadId: string, type: string, _label: string, note: string | null): Promise<void> {
    await crm.createAtividade({
      empresa_id: leadId,
      tipo: type === "sms_linkedin" ? "linkedin" : (type as Atividade["tipo"]),
      resultado: "sem_resposta",
      nota: note,
    });
  },
};
