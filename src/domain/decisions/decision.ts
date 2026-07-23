export const DECISION_STATUSES = ["current", "superseded", "revoked"] as const;
export type DecisionStatus = (typeof DECISION_STATUSES)[number];

export const DECISION_STATUS_LABELS: Record<DecisionStatus, string> = {
  current: "Vigente",
  superseded: "Substituída",
  revoked: "Revogada",
};

export const DECISION_REVIEW_EFFECTS = ["supersedes", "limits", "revokes"] as const;
export type DecisionReviewEffect = (typeof DECISION_REVIEW_EFFECTS)[number];

export const DECISION_REVIEW_EFFECT_LABELS: Record<DecisionReviewEffect, string> = {
  supersedes: "Substitui",
  limits: "Limita",
  revokes: "Revoga",
};

export type DecisionRevision = Readonly<{
  previousDecisionId: string;
  effect: DecisionReviewEffect;
}>;

export type Decision = Readonly<{
  id: string;
  title: string;
  choice: string;
  reason: string;
  alternatives: string | null;
  impact: string;
  status: DecisionStatus;
  authorityMemberId: string;
  decidedOn: string;
  originMeetingId: string | null;
  companyIds: readonly string[];
  meetingIds: readonly string[];
  taskIds: readonly string[];
  revision: DecisionRevision | null;
  createdAt: string;
  updatedAt: string;
}>;

export type DecisionValues = {
  title: string;
  choice: string;
  reason: string;
  alternatives?: string | null;
  impact: string;
  authorityMemberId: string;
  decidedOn: string;
  originMeetingId?: string | null;
  companyIds?: readonly string[];
  meetingIds?: readonly string[];
  taskIds?: readonly string[];
};

export type ValidDecisionValues = Readonly<{
  title: string;
  choice: string;
  reason: string;
  alternatives: string | null;
  impact: string;
  authorityMemberId: string;
  decidedOn: string;
  originMeetingId: string | null;
  companyIds: readonly string[];
  meetingIds: readonly string[];
  taskIds: readonly string[];
}>;

export class DecisionValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DecisionValidationError";
  }
}

export class DecisionRevisionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DecisionRevisionError";
  }
}

function requiredText(value: string, label: string, maximum: number): string {
  const normalized = value.trim();
  if (!normalized) throw new DecisionValidationError(`${label} é obrigatório.`);
  if (normalized.length > maximum) {
    throw new DecisionValidationError(`${label} não pode exceder ${maximum} caracteres.`);
  }
  return normalized;
}

function optionalText(
  value: string | null | undefined,
  label: string,
  maximum: number,
): string | null {
  const normalized = value?.trim() ?? "";
  if (!normalized) return null;
  if (normalized.length > maximum) {
    throw new DecisionValidationError(`${label} não pode exceder ${maximum} caracteres.`);
  }
  return normalized;
}

function uniqueIds(values: readonly string[] = []): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function validDate(value: string): string {
  const normalized = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    throw new DecisionValidationError("A data da decisão não é válida.");
  }
  const date = new Date(`${normalized}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== normalized) {
    throw new DecisionValidationError("A data da decisão não é válida.");
  }
  return normalized;
}

export function validateDecisionValues(values: DecisionValues): ValidDecisionValues {
  const originMeetingId = optionalText(values.originMeetingId, "A Meeting de origem", 100);
  const meetingIds = uniqueIds(values.meetingIds);
  if (originMeetingId && !meetingIds.includes(originMeetingId)) meetingIds.push(originMeetingId);

  return {
    title: requiredText(values.title, "O título", 160),
    choice: requiredText(values.choice, "A escolha", 4000),
    reason: requiredText(values.reason, "O motivo", 4000),
    alternatives: optionalText(values.alternatives, "As alternativas", 4000),
    impact: requiredText(values.impact, "O impacto", 4000),
    authorityMemberId: requiredText(values.authorityMemberId, "A autoridade", 100),
    decidedOn: validDate(values.decidedOn),
    originMeetingId,
    companyIds: uniqueIds(values.companyIds),
    meetingIds,
    taskIds: uniqueIds(values.taskIds),
  };
}

export function validateDecisionRevision(
  decisionId: string,
  previousDecisionId: string,
  effect: string,
): DecisionRevision {
  const currentId = requiredText(decisionId, "A nova Decision", 100);
  const previousId = requiredText(previousDecisionId, "A Decision anterior", 100);
  if (currentId === previousId) {
    throw new DecisionRevisionError("Uma Decision não pode rever-se a si própria.");
  }
  if (!DECISION_REVIEW_EFFECTS.includes(effect as DecisionReviewEffect)) {
    throw new DecisionRevisionError("Seleciona um efeito de revisão válido.");
  }
  return { previousDecisionId: previousId, effect: effect as DecisionReviewEffect };
}

export function statusAfterRevision(
  previousStatus: DecisionStatus,
  effect: DecisionReviewEffect,
): DecisionStatus {
  if (previousStatus !== "current") {
    throw new DecisionRevisionError("Apenas uma Decision vigente pode ser revista.");
  }
  if (effect === "supersedes") return "superseded";
  if (effect === "revokes") return "revoked";
  return "current";
}
