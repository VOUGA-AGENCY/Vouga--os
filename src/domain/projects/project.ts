export const PROJECT_STATUSES = [
  "not_started",
  "in_progress",
  "waiting_client",
  "delivered",
  "closed",
] as const;

export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  not_started: "Por iniciar",
  in_progress: "Em curso",
  waiting_client: "À espera do cliente",
  delivered: "Entregue",
  closed: "Encerrado",
};

export const PROJECT_SCOPE_KINDS = ["in_scope", "out_of_scope"] as const;
export type ProjectScopeKind = (typeof PROJECT_SCOPE_KINDS)[number];

export type ProjectScopeItem = Readonly<{
  id: string;
  kind: ProjectScopeKind;
  label: string;
  position: number;
}>;

export type ProjectMilestone = Readonly<{
  id: string;
  title: string;
  position: number;
  completedAt: string | null;
}>;

export type ProjectResource = Readonly<{
  id: string;
  title: string;
  kind: string | null;
  url: string;
  position: number;
}>;

export type Project = Readonly<{
  id: string;
  name: string;
  clientCompanyId: string;
  ownerMemberId: string;
  status: ProjectStatus;
  startsOn: string;
  targetDeliveryOn: string;
  agreedAmountMinor: number;
  receivedAmountMinor: number;
  currency: string;
  objective: string;
  expectedResult: string;
  nextTaskId: string | null;
  teamMemberIds: readonly string[];
  contactIds: readonly string[];
  taskIds: readonly string[];
  meetingIds: readonly string[];
  decisionIds: readonly string[];
  costIds: readonly string[];
  scopeItems: readonly ProjectScopeItem[];
  milestones: readonly ProjectMilestone[];
  resources: readonly ProjectResource[];
  createdAt: string;
  updatedAt: string;
}>;

export type ProjectOwnedItemValues = Readonly<{
  id?: string | null;
  title?: string;
  label?: string;
  kind?: string | null;
  url?: string;
  completedAt?: string | null;
}>;

export type ProjectValues = {
  name: string;
  clientCompanyId: string;
  ownerMemberId: string;
  startsOn: string;
  targetDeliveryOn: string;
  agreedAmountMinor: number;
  receivedAmountMinor?: number;
  currency: string;
  objective: string;
  expectedResult: string;
  nextTaskId?: string | null;
  teamMemberIds?: readonly string[];
  contactIds?: readonly string[];
  taskIds?: readonly string[];
  meetingIds?: readonly string[];
  decisionIds?: readonly string[];
  costIds?: readonly string[];
  scopeItems?: readonly ProjectOwnedItemValues[];
  outOfScopeItems?: readonly ProjectOwnedItemValues[];
  milestones?: readonly ProjectOwnedItemValues[];
  resources?: readonly ProjectOwnedItemValues[];
};

export type ValidProjectOwnedItem = Readonly<{
  id: string | null;
  title: string;
}>;

export type ValidProjectMilestone = ValidProjectOwnedItem &
  Readonly<{
    completedAt: string | null;
  }>;

export type ValidProjectResource = ValidProjectOwnedItem &
  Readonly<{
    kind: string | null;
    url: string;
  }>;

export type ValidProjectValues = Readonly<{
  name: string;
  clientCompanyId: string;
  ownerMemberId: string;
  startsOn: string;
  targetDeliveryOn: string;
  agreedAmountMinor: number;
  receivedAmountMinor: number;
  currency: string;
  objective: string;
  expectedResult: string;
  nextTaskId: string | null;
  teamMemberIds: readonly string[];
  contactIds: readonly string[];
  taskIds: readonly string[];
  meetingIds: readonly string[];
  decisionIds: readonly string[];
  costIds: readonly string[];
  scopeItems: readonly ValidProjectOwnedItem[];
  outOfScopeItems: readonly ValidProjectOwnedItem[];
  milestones: readonly ValidProjectMilestone[];
  resources: readonly ValidProjectResource[];
}>;

export class ProjectValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProjectValidationError";
  }
}

export class ProjectTransitionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProjectTransitionError";
  }
}

function required(value: string, label: string, maximum: number) {
  const text = value.trim();
  if (!text) throw new ProjectValidationError(`${label} é obrigatório.`);
  if (text.length > maximum) {
    throw new ProjectValidationError(`${label} não pode exceder ${maximum} caracteres.`);
  }
  return text;
}

function optional(value: string | null | undefined, label: string, maximum: number) {
  const text = value?.trim() ?? "";
  if (!text) return null;
  if (text.length > maximum) {
    throw new ProjectValidationError(`${label} não pode exceder ${maximum} caracteres.`);
  }
  return text;
}

function uniqueIds(values: readonly string[] = []) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function date(value: string, label: string) {
  const normalized = required(value, label, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    throw new ProjectValidationError(`${label} não é válida.`);
  }
  const parsed = new Date(`${normalized}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== normalized) {
    throw new ProjectValidationError(`${label} não é válida.`);
  }
  return normalized;
}

function itemId(value: string | null | undefined) {
  const id = value?.trim() ?? "";
  return id || null;
}

function ownedItems(
  values: readonly ProjectOwnedItemValues[] = [],
  label: string,
  maximum: number,
): ValidProjectOwnedItem[] {
  if (values.length > maximum) {
    throw new ProjectValidationError(`${label} não pode ter mais de ${maximum} itens.`);
  }
  return values.map((item) => ({
    id: itemId(item.id),
    title: required(item.title ?? item.label ?? "", `O item de ${label.toLowerCase()}`, 240),
  }));
}

function milestones(values: readonly ProjectOwnedItemValues[] = []): ValidProjectMilestone[] {
  if (values.length > 5) {
    throw new ProjectValidationError("O Project não pode ter mais de 5 marcos.");
  }
  return values.map((item) => {
    const completedAt = optional(item.completedAt, "A conclusão do marco", 40);
    if (completedAt && Number.isNaN(Date.parse(completedAt))) {
      throw new ProjectValidationError("A conclusão do marco não é válida.");
    }
    return {
      id: itemId(item.id),
      title: required(item.title ?? "", "O título do marco", 240),
      completedAt: completedAt ? new Date(completedAt).toISOString() : null,
    };
  });
}

function resources(values: readonly ProjectOwnedItemValues[] = []): ValidProjectResource[] {
  if (values.length > 20) {
    throw new ProjectValidationError("O Project não pode ter mais de 20 recursos.");
  }
  return values.map((item) => {
    const url = required(item.url ?? "", "O URL do recurso", 2048);
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      throw new ProjectValidationError("O URL do recurso não é válido.");
    }
    if (!["http:", "https:"].includes(parsed.protocol)) {
      throw new ProjectValidationError("O recurso tem de usar um URL HTTP ou HTTPS.");
    }
    return {
      id: itemId(item.id),
      title: required(item.title ?? "", "O título do recurso", 160),
      kind: optional(item.kind, "O tipo do recurso", 80),
      url: parsed.toString(),
    };
  });
}

export function validateProjectValues(values: ProjectValues): ValidProjectValues {
  const startsOn = date(values.startsOn, "A data de início");
  const targetDeliveryOn = date(values.targetDeliveryOn, "A data prevista de entrega");
  if (targetDeliveryOn < startsOn) {
    throw new ProjectValidationError("A data prevista de entrega não pode ser anterior ao início.");
  }
  if (!Number.isSafeInteger(values.agreedAmountMinor) || values.agreedAmountMinor <= 0) {
    throw new ProjectValidationError("O valor acordado tem de ser positivo.");
  }
  const receivedAmountMinor = values.receivedAmountMinor ?? 0;
  if (
    !Number.isSafeInteger(receivedAmountMinor) ||
    receivedAmountMinor < 0 ||
    receivedAmountMinor > values.agreedAmountMinor
  ) {
    throw new ProjectValidationError(
      "O valor recebido tem de estar entre zero e o valor acordado.",
    );
  }
  const currency = required(values.currency, "A moeda", 3).toUpperCase();
  if (!/^[A-Z]{3}$/.test(currency)) {
    throw new ProjectValidationError("A moeda tem de usar um código ISO de três letras.");
  }

  const ownerMemberId = required(values.ownerMemberId, "O responsável Vouga", 100);
  const taskIds = uniqueIds(values.taskIds);
  const nextTaskId = optional(values.nextTaskId, "A próxima ação", 100);
  if (nextTaskId && !taskIds.includes(nextTaskId)) {
    throw new ProjectValidationError("A próxima ação tem de ser uma Task associada ao Project.");
  }

  return {
    name: required(values.name, "O nome", 160),
    clientCompanyId: required(values.clientCompanyId, "O cliente", 100),
    ownerMemberId,
    startsOn,
    targetDeliveryOn,
    agreedAmountMinor: values.agreedAmountMinor,
    receivedAmountMinor,
    currency,
    objective: required(values.objective, "O objetivo", 800),
    expectedResult: required(values.expectedResult, "O resultado esperado", 800),
    nextTaskId,
    teamMemberIds: uniqueIds([ownerMemberId, ...(values.teamMemberIds ?? [])]),
    contactIds: uniqueIds(values.contactIds),
    taskIds,
    meetingIds: uniqueIds(values.meetingIds),
    decisionIds: uniqueIds(values.decisionIds),
    costIds: uniqueIds(values.costIds),
    scopeItems: ownedItems(values.scopeItems, "O âmbito", 50),
    outOfScopeItems: ownedItems(values.outOfScopeItems, "Fora do âmbito", 50),
    milestones: milestones(values.milestones),
    resources: resources(values.resources),
  };
}

const ALLOWED_TRANSITIONS: Record<ProjectStatus, readonly ProjectStatus[]> = {
  not_started: ["in_progress"],
  in_progress: ["waiting_client", "delivered"],
  waiting_client: ["in_progress", "delivered"],
  delivered: ["in_progress", "closed"],
  closed: [],
};

export function transitionProject(
  project: Project,
  nextStatus: ProjectStatus,
  changedAt: string,
): Project {
  if (!PROJECT_STATUSES.includes(nextStatus)) {
    throw new ProjectTransitionError("O estado do Project não é válido.");
  }
  if (!ALLOWED_TRANSITIONS[project.status].includes(nextStatus)) {
    throw new ProjectTransitionError(
      `Não é possível passar de ${PROJECT_STATUS_LABELS[project.status]} para ${PROJECT_STATUS_LABELS[nextStatus]}.`,
    );
  }
  const instant = new Date(changedAt);
  if (Number.isNaN(instant.getTime())) {
    throw new ProjectValidationError("O momento da mudança de estado não é válido.");
  }
  return {
    ...project,
    status: nextStatus,
    updatedAt: instant.toISOString(),
  };
}

export function availableProjectTransitions(status: ProjectStatus): readonly ProjectStatus[] {
  return ALLOWED_TRANSITIONS[status];
}

export function assertProjectEditable(project: Project) {
  if (project.status === "closed") {
    throw new ProjectTransitionError("Um Project encerrado já não pode ser editado.");
  }
}
