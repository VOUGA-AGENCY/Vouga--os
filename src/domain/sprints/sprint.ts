import type { TaskStatus } from "@/domain/tasks/task";

export const SPRINT_STATUSES = ["planned", "active", "closed", "cancelled"] as const;
export type SprintStatus = (typeof SPRINT_STATUSES)[number];
export const SPRINT_STATUS_LABELS: Record<SprintStatus, string> = {
  planned: "Planeada",
  active: "Ativa",
  closed: "Encerrada",
  cancelled: "Cancelada",
};

export const SPRINT_CLOSURE_DISPOSITIONS = ["completed", "recommitted", "split", "returned_to_future", "cancelled"] as const;
export type SprintClosureDisposition = (typeof SPRINT_CLOSURE_DISPOSITIONS)[number];
export const SPRINT_CLOSURE_DISPOSITION_LABELS: Record<SprintClosureDisposition, string> = {
  completed: "Concluída",
  recommitted: "Nova assunção futura",
  split: "Dividida",
  returned_to_future: "Devolvida ao trabalho futuro",
  cancelled: "Cancelada",
};

export type SprintTaskCommitment = Readonly<{
  taskId: string;
  taskStatus: TaskStatus;
  committedAt: string;
  closureDisposition: SprintClosureDisposition | null;
}>;

export type Sprint = Readonly<{
  id: string;
  name: string;
  intendedResult: string;
  status: SprintStatus;
  ownerMemberId: string;
  startsOn: string;
  endsOn: string;
  materialRisks: string | null;
  actualResult: string | null;
  learning: string | null;
  tasks: readonly SprintTaskCommitment[];
  createdAt: string;
  updatedAt: string;
}>;

export type SprintValues = {
  name: string;
  intendedResult: string;
  ownerMemberId: string;
  startsOn: string;
  endsOn: string;
  materialRisks?: string | null;
  taskIds?: readonly string[];
};

export type ValidSprintValues = Readonly<{
  name: string;
  intendedResult: string;
  ownerMemberId: string;
  startsOn: string;
  endsOn: string;
  materialRisks: string | null;
  taskIds: readonly string[];
}>;

export type SprintClosureValues = Readonly<{
  actualResult: string;
  learning: string;
  incompleteDispositions: Readonly<Record<string, SprintClosureDisposition>>;
}>;

export class SprintValidationError extends Error {
  constructor(message: string) { super(message); this.name = "SprintValidationError"; }
}
export class SprintTransitionError extends Error {
  constructor(message: string) { super(message); this.name = "SprintTransitionError"; }
}

function required(value: string, label: string, max: number) {
  const text = value.trim();
  if (!text) throw new SprintValidationError(`${label} é obrigatório.`);
  if (text.length > max) throw new SprintValidationError(`${label} não pode exceder ${max} caracteres.`);
  return text;
}
function optional(value: string | null | undefined, label: string, max: number) {
  const text = value?.trim() ?? "";
  if (!text) return null;
  if (text.length > max) throw new SprintValidationError(`${label} não pode exceder ${max} caracteres.`);
  return text;
}
function ids(values: readonly string[] = []) { return [...new Set(values.map((value) => value.trim()).filter(Boolean))]; }

export function validateSprintValues(values: SprintValues): ValidSprintValues {
  const startsOn = required(values.startsOn, "A data de início", 10);
  const endsOn = required(values.endsOn, "A data de fim", 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startsOn) || !/^\d{4}-\d{2}-\d{2}$/.test(endsOn)) throw new SprintValidationError("As datas da Sprint não são válidas.");
  if (startsOn > endsOn) throw new SprintValidationError("A data de fim não pode ser anterior à data de início.");
  return {
    name: required(values.name, "O nome", 160),
    intendedResult: required(values.intendedResult, "O resultado pretendido", 2000),
    ownerMemberId: required(values.ownerMemberId, "O owner", 100),
    startsOn,
    endsOn,
    materialRisks: optional(values.materialRisks, "Os riscos materiais", 4000),
    taskIds: ids(values.taskIds),
  };
}

export function assertCanActivateSprint(sprint: Sprint) {
  if (sprint.status !== "planned") throw new SprintTransitionError("Apenas uma Sprint planeada pode ser ativada.");
  if (!sprint.tasks.length) throw new SprintTransitionError("Adiciona pelo menos uma Task antes de ativar a Sprint.");
}
export function assertCanChangeCommitment(sprint: Sprint, removing = false) {
  if (sprint.status !== "planned" && sprint.status !== "active") throw new SprintTransitionError("Esta Sprint já não aceita alterações ao compromisso.");
  if (removing && sprint.status !== "planned") throw new SprintTransitionError("Depois da ativação, o compromisso só pode crescer por inclusão urgente explícita.");
}
export function assertCanCancelSprint(sprint: Sprint) {
  if (sprint.status !== "planned" && sprint.status !== "active") throw new SprintTransitionError("Esta Sprint já não pode ser cancelada.");
}
export function validateSprintClosure(sprint: Sprint, values: SprintClosureValues) {
  if (sprint.status !== "active") throw new SprintTransitionError("Apenas uma Sprint ativa pode ser encerrada.");
  const actualResult = required(values.actualResult, "O resultado real", 4000);
  const learning = required(values.learning, "A aprendizagem", 4000);
  const dispositions: Record<string, SprintClosureDisposition> = {};
  for (const task of sprint.tasks) {
    if (task.taskStatus === "completed") dispositions[task.taskId] = "completed";
    else if (task.taskStatus === "cancelled") dispositions[task.taskId] = "cancelled";
    else {
      const disposition = values.incompleteDispositions[task.taskId];
      if (!disposition || disposition === "completed") throw new SprintValidationError("Define o destino de cada Task incompleta.");
      dispositions[task.taskId] = disposition;
    }
  }
  return { actualResult, learning, dispositions } as const;
}

export function deriveSprintProgress(tasks: readonly Pick<SprintTaskCommitment, "taskStatus">[]) {
  const counts: Record<TaskStatus, number> = { todo: 0, in_progress: 0, blocked: 0, completed: 0, cancelled: 0 };
  for (const task of tasks) counts[task.taskStatus] += 1;
  return { total: tasks.length, ...counts } as const;
}
