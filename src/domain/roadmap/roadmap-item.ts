export const ROADMAP_KINDS = ["problem", "outcome", "hypothesis"] as const;
export type RoadmapKind = (typeof ROADMAP_KINDS)[number];
export const ROADMAP_KIND_LABELS: Record<RoadmapKind, string> = {
  problem: "Problema",
  outcome: "Resultado",
  hypothesis: "Hipótese",
};

export const ROADMAP_HORIZONS = ["now", "next", "later"] as const;
export type RoadmapHorizon = (typeof ROADMAP_HORIZONS)[number];
export const ROADMAP_HORIZON_LABELS: Record<RoadmapHorizon, string> = {
  now: "Now",
  next: "Next",
  later: "Later",
};

export const ROADMAP_LIFECYCLE_STATUSES = ["active", "completed", "abandoned"] as const;
export type RoadmapLifecycleStatus = (typeof ROADMAP_LIFECYCLE_STATUSES)[number];
export const ROADMAP_LIFECYCLE_STATUS_LABELS: Record<RoadmapLifecycleStatus, string> = {
  active: "Ativo",
  completed: "Concluído",
  abandoned: "Abandonado",
};

export type RoadmapItem = Readonly<{
  id: string;
  title: string;
  kind: RoadmapKind;
  description: string;
  evidence: string;
  horizon: RoadmapHorizon;
  lifecycleStatus: RoadmapLifecycleStatus;
  ownerMemberId: string | null;
  companyIds: readonly string[];
  taskIds: readonly string[];
  sprintIds: readonly string[];
  decisionIds: readonly string[];
  createdAt: string;
  updatedAt: string;
}>;

export type RoadmapItemValues = {
  title: string;
  kind: RoadmapKind;
  description: string;
  evidence: string;
  horizon: RoadmapHorizon;
  ownerMemberId?: string | null;
  companyIds?: readonly string[];
  taskIds?: readonly string[];
  sprintIds?: readonly string[];
  decisionIds?: readonly string[];
};

export type ValidRoadmapItemValues = Readonly<{
  title: string;
  kind: RoadmapKind;
  description: string;
  evidence: string;
  horizon: RoadmapHorizon;
  ownerMemberId: string | null;
  companyIds: readonly string[];
  taskIds: readonly string[];
  sprintIds: readonly string[];
  decisionIds: readonly string[];
}>;

export class RoadmapValidationError extends Error {
  constructor(message: string) { super(message); this.name = "RoadmapValidationError"; }
}
export class RoadmapTransitionError extends Error {
  constructor(message: string) { super(message); this.name = "RoadmapTransitionError"; }
}

function required(value: string, label: string, max: number) {
  const text = value.trim();
  if (!text) throw new RoadmapValidationError(`${label} é obrigatório.`);
  if (text.length > max) throw new RoadmapValidationError(`${label} não pode exceder ${max} caracteres.`);
  return text;
}
function ids(values: readonly string[] = []) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

export function validateRoadmapItemValues(values: RoadmapItemValues): ValidRoadmapItemValues {
  if (!ROADMAP_KINDS.includes(values.kind)) throw new RoadmapValidationError("O tipo do Roadmap Item não é válido.");
  if (!ROADMAP_HORIZONS.includes(values.horizon)) throw new RoadmapValidationError("O horizonte do Roadmap Item não é válido.");
  const ownerMemberId = values.ownerMemberId?.trim() || null;
  if (values.horizon === "now" && !ownerMemberId) {
    throw new RoadmapValidationError("Um Roadmap Item em Now precisa de owner.");
  }
  if (values.horizon === "now" && ids(values.taskIds).length === 0) {
    throw new RoadmapValidationError("Um Roadmap Item em Now precisa de pelo menos uma Task relacionada.");
  }
  return {
    title: required(values.title, "O título", 160),
    kind: values.kind,
    description: required(values.description, "A descrição", 4000),
    evidence: required(values.evidence, "A evidência", 4000),
    horizon: values.horizon,
    ownerMemberId,
    companyIds: ids(values.companyIds),
    taskIds: ids(values.taskIds),
    sprintIds: ids(values.sprintIds),
    decisionIds: ids(values.decisionIds),
  };
}

export function assertRoadmapItemEditable(item: RoadmapItem) {
  if (item.lifecycleStatus !== "active") {
    throw new RoadmapTransitionError("Um Roadmap Item concluído ou abandonado já não pode ser editado.");
  }
}

export function assertHorizonChangeHasDecision(item: RoadmapItem, values: ValidRoadmapItemValues) {
  if (item.horizon !== values.horizon && values.decisionIds.length === 0) {
    throw new RoadmapValidationError("Relaciona uma Decision para justificar a mudança de horizonte.");
  }
}

export function assertCanFinishRoadmapItem(item: RoadmapItem) {
  assertRoadmapItemEditable(item);
}
