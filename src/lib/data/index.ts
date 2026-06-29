// Ponto de entrada único da camada de dados do Vouga OS.
// As páginas importam daqui (ex.: import { tasks } from "@/lib/data"),
// nunca o cliente Supabase diretamente. Trocar de base de dados = trocar
// os adapters aqui dentro, sem mexer nas páginas.

export { steps } from "./steps";
export { tasks } from "./tasks";
export { sprints } from "./sprints";
export { milestones } from "./milestones";
export { documents, resources } from "./documents";
export { crm } from "./crm";
export { finance } from "./finance";
export { events } from "./events";
export type {
  Step,
  Task,
  Sprint,
  Milestone,
  Doc,
  Resource,
  Lead,
  LeadAction,
  Empresa,
  EmpresaEstagio,
  EmpresaVertical,
  Contacto,
  Atividade,
  ModeloMensagem,
  ReuniaoComercial,
  Cost,
  CalEvent,
} from "./types";
