// Tipos de domínio do Vouga OS, independentes da base de dados.
// A camada de dados (src/lib/data) traduz estes tipos para o adapter atual
// (Supabase). Para migrar para uma base externa, troca-se só o adapter.

export interface Step {
  id: string;
  title: string;
  done: boolean;
  notes: string;
  position: number;
  created_at: string;
}

export interface Task {
  id: string;
  title: string;
  status: string; // todo | doing | blocked | done
  priority: string; // urgent | important | medium | low
  notes: string;
  assignee: string | null;
  effort: number | null; // semanas
  sprint_id: string | null;
  created_at: string;
}

export interface Sprint {
  id: string;
  name: string;
  starts_on: string;
  ends_on: string;
}

export interface Milestone {
  id: string;
  title: string;
  target_date: string | null;
  status: string;
  description: string | null;
}

export interface Doc {
  id: string;
  title: string;
  content: string;
  task_id: string | null;
  updated_at: string;
}

export interface Resource {
  id: string;
  name: string;
  path: string;
  mime: string | null;
  size: number | null;
  task_id: string | null;
  created_at: string;
}

export interface Lead {
  id: string;
  name: string;
  status: string; // por_enviar | enviado | agendado | acordado
  location: string | null;
  focus: string | null;
  contacts: string | null;
  responsaveis: string | null;
  notes: string | null;
  next_action_at: string | null;
}

export interface LeadAction {
  id: string;
  type: string;
  note: string | null;
  acted_on: string;
}

export type EmpresaEstagio =
  | "alvo"
  | "contactado"
  | "em_conversa"
  | "discovery"
  | "proposta"
  | "ganho"
  | "perdido"
  | "adormecido";

export type EmpresaVertical = "quote" | "maintenance" | "quality";

export interface Empresa {
  id: string;
  nome: string;
  setor: string | null;
  localizacao: string | null;
  dimensao: string | null;
  vertical: EmpresaVertical | null;
  origem: string | null;
  responsavel: string | null;
  estagio: EmpresaEstagio;
  valor_estimado: number | null; // euros
  proximo_passo: string | null;
  proximo_passo_data: string | null;
  motivo_saida: string | null;
  notas: string | null;
  created_at: string;
  updated_at: string;
}

export interface Contacto {
  id: string;
  empresa_id: string;
  nome: string;
  cargo: string | null;
  email: string | null;
  telefone: string | null;
  linkedin: string | null;
  created_at: string;
}

export interface Atividade {
  id: string;
  empresa_id: string;
  contacto_id: string | null;
  tipo: "email" | "linkedin" | "chamada" | "cafe" | "visita" | "reuniao";
  data: string;
  resultado: "sem_resposta" | "respondeu" | "reuniao_marcada";
  nota: string | null;
}

export interface ModeloMensagem {
  id: string;
  titulo: string;
  categoria: "primeiro_contacto" | "follow_up" | "convite";
  corpo: string;
  created_at: string;
}

export interface ReuniaoComercial {
  id: string;
  empresa_id: string;
  contacto_id: string | null;
  titulo: string;
  data: string;
  calendar_event_id: string | null;
}

export interface Cost {
  id: string;
  area: string;
  amount_cents: number;
  period: string; // monthly | annual | one_off
  description: string | null;
  occurred_on: string;
}

export interface CalEvent {
  id: string;
  title: string;
  kind: string;
  starts_at: string;
  ends_at: string | null;
  source_type: string | null;
  source_id: string | null;
}
