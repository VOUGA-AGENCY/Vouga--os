export const COST_TYPES = ["one_off", "recurring"] as const;
export type CostType = (typeof COST_TYPES)[number];
export const COST_TYPE_LABELS: Record<CostType, string> = {
  one_off: "Pontual",
  recurring: "Recorrente",
};

export const COST_STATUSES = ["planned", "active", "paid", "ended", "cancelled"] as const;
export type CostStatus = (typeof COST_STATUSES)[number];
export const COST_STATUS_LABELS: Record<CostStatus, string> = {
  planned: "Planeado",
  active: "Ativo",
  paid: "Pago",
  ended: "Terminado",
  cancelled: "Cancelado",
};

export const COST_RECURRENCES = ["monthly", "quarterly", "yearly"] as const;
export type CostRecurrence = (typeof COST_RECURRENCES)[number];
export const COST_RECURRENCE_LABELS: Record<CostRecurrence, string> = {
  monthly: "Mensal",
  quarterly: "Trimestral",
  yearly: "Anual",
};

export const COST_CATEGORIES = [
  "software",
  "infrastructure",
  "professional_services",
  "marketing_sales",
  "workspace_operations",
  "travel",
  "other",
] as const;
export type CostCategory = (typeof COST_CATEGORIES)[number];
export const COST_CATEGORY_LABELS: Record<CostCategory, string> = {
  software: "Software",
  infrastructure: "Infraestrutura",
  professional_services: "Serviços profissionais",
  marketing_sales: "Marketing e vendas",
  workspace_operations: "Workspace e operação",
  travel: "Viagens",
  other: "Outro",
};

export type Cost = Readonly<{
  id: string;
  title: string;
  description: string;
  category: CostCategory;
  supplier: string | null;
  expectedAmountMinor: number;
  actualAmountMinor: number | null;
  currency: string;
  costType: CostType;
  recurrence: CostRecurrence | null;
  expectedOn: string | null;
  startsOn: string | null;
  billingAnchorOn: string | null;
  paidOn: string | null;
  endedOn: string | null;
  cancelledOn: string | null;
  status: CostStatus;
  ownerMemberId: string | null;
  companyId: string | null;
  roadmapItemId: string | null;
  sourceDecisionId: string | null;
  taskIds: readonly string[];
  createdAt: string;
  updatedAt: string;
}>;

export type CostValues = {
  title: string;
  description: string;
  category: CostCategory;
  supplier?: string | null;
  expectedAmountMinor: number;
  currency: string;
  costType: CostType;
  recurrence?: CostRecurrence | null;
  expectedOn?: string | null;
  startsOn?: string | null;
  billingAnchorOn?: string | null;
  ownerMemberId?: string | null;
  companyId?: string | null;
  roadmapItemId?: string | null;
  sourceDecisionId?: string | null;
  taskIds?: readonly string[];
};

export type ValidCostValues = Readonly<{
  title: string;
  description: string;
  category: CostCategory;
  supplier: string | null;
  expectedAmountMinor: number;
  currency: string;
  costType: CostType;
  recurrence: CostRecurrence | null;
  expectedOn: string | null;
  startsOn: string | null;
  billingAnchorOn: string | null;
  ownerMemberId: string | null;
  companyId: string | null;
  roadmapItemId: string | null;
  sourceDecisionId: string | null;
  taskIds: readonly string[];
}>;

export class CostValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CostValidationError";
  }
}

export class CostTransitionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CostTransitionError";
  }
}

function required(value: string, label: string, max: number) {
  const text = value.trim();
  if (!text) throw new CostValidationError(`${label} é obrigatório.`);
  if (text.length > max) {
    throw new CostValidationError(`${label} não pode exceder ${max} caracteres.`);
  }
  return text;
}

function optional(value: string | null | undefined, label: string, max: number) {
  const text = value?.trim() ?? "";
  if (!text) return null;
  if (text.length > max) {
    throw new CostValidationError(`${label} não pode exceder ${max} caracteres.`);
  }
  return text;
}

function date(value: string | null | undefined, label: string) {
  if (!value) return null;
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
    Number.isNaN(new Date(`${value}T00:00:00Z`).getTime())
  ) {
    throw new CostValidationError(`${label} não é válida.`);
  }
  return value;
}

function identifier(value: string | null | undefined) {
  return value?.trim() || null;
}

export function validateCostValues(values: CostValues): ValidCostValues {
  if (!COST_TYPES.includes(values.costType)) {
    throw new CostValidationError("O tipo de Cost não é válido.");
  }
  if (!COST_CATEGORIES.includes(values.category)) {
    throw new CostValidationError("A categoria do Cost não é válida.");
  }
  if (!Number.isSafeInteger(values.expectedAmountMinor) || values.expectedAmountMinor <= 0) {
    throw new CostValidationError("O valor esperado deve ser positivo.");
  }
  const currency = required(values.currency, "A moeda", 3).toUpperCase();
  if (!/^[A-Z]{3}$/.test(currency)) {
    throw new CostValidationError("A moeda deve usar um código ISO com três letras.");
  }

  const recurrence = values.recurrence ?? null;
  const expectedOn = date(values.expectedOn, "A data esperada");
  const startsOn = date(values.startsOn, "A data de início");
  const billingAnchorOn = date(values.billingAnchorOn, "A âncora de cobrança");

  if (values.costType === "one_off") {
    if (!expectedOn) throw new CostValidationError("Um Cost pontual precisa de data esperada.");
    if (recurrence || startsOn || billingAnchorOn) {
      throw new CostValidationError("Um Cost pontual não aceita recorrência.");
    }
  } else {
    if (!recurrence || !COST_RECURRENCES.includes(recurrence)) {
      throw new CostValidationError("Um Cost recorrente precisa de recorrência.");
    }
    if (!startsOn || !billingAnchorOn) {
      throw new CostValidationError("Um Cost recorrente precisa de início e âncora de cobrança.");
    }
    if (billingAnchorOn < startsOn) {
      throw new CostValidationError("A âncora de cobrança não pode ser anterior ao início.");
    }
    if (expectedOn) {
      throw new CostValidationError("A data esperada isolada pertence apenas a Costs pontuais.");
    }
  }

  return {
    title: required(values.title, "O título", 160),
    description: required(values.description, "A descrição", 4000),
    category: values.category,
    supplier: optional(values.supplier, "O fornecedor", 200),
    expectedAmountMinor: values.expectedAmountMinor,
    currency,
    costType: values.costType,
    recurrence,
    expectedOn,
    startsOn,
    billingAnchorOn,
    ownerMemberId: identifier(values.ownerMemberId),
    companyId: identifier(values.companyId),
    roadmapItemId: identifier(values.roadmapItemId),
    sourceDecisionId: identifier(values.sourceDecisionId),
    taskIds: [...new Set((values.taskIds ?? []).map((id) => id.trim()).filter(Boolean))],
  };
}

export function assertCostEditable(cost: Cost, values: ValidCostValues) {
  if (["paid", "ended", "cancelled"].includes(cost.status)) {
    throw new CostTransitionError("Um Cost terminal já não pode ser editado.");
  }
  if (cost.costType !== values.costType) {
    throw new CostTransitionError("O tipo do Cost não pode ser alterado.");
  }
  if (
    cost.status === "active" &&
    (cost.expectedAmountMinor !== values.expectedAmountMinor ||
      cost.currency !== values.currency ||
      cost.recurrence !== values.recurrence ||
      cost.billingAnchorOn !== values.billingAnchorOn)
  ) {
    throw new CostTransitionError(
      "Valor, moeda, recorrência e âncora não mudam depois da ativação.",
    );
  }
}

function planned(cost: Cost) {
  if (cost.status !== "planned") {
    throw new CostTransitionError("Apenas um Cost planeado aceita esta alteração.");
  }
}

export function activateRecurringCost(cost: Cost): Cost {
  planned(cost);
  if (cost.costType !== "recurring") {
    throw new CostTransitionError("Apenas um Cost recorrente pode ser ativado.");
  }
  if (!cost.ownerMemberId) throw new CostValidationError("Um Cost ativo precisa de owner.");
  return { ...cost, status: "active" };
}

export function payOneOffCost(cost: Cost, actualAmountMinor: number, paidOn: string): Cost {
  planned(cost);
  if (cost.costType !== "one_off") {
    throw new CostTransitionError("Apenas um Cost pontual pode ser marcado como pago.");
  }
  if (!cost.ownerMemberId) throw new CostValidationError("Um Cost pago precisa de owner.");
  if (!Number.isSafeInteger(actualAmountMinor) || actualAmountMinor <= 0) {
    throw new CostValidationError("O valor real deve ser positivo.");
  }
  const validPaidOn = date(paidOn, "A data de pagamento");
  if (!validPaidOn) throw new CostValidationError("A data de pagamento é obrigatória.");
  return { ...cost, actualAmountMinor, paidOn: validPaidOn, status: "paid" };
}

export function endRecurringCost(cost: Cost, endedOn: string): Cost {
  if (cost.costType !== "recurring" || cost.status !== "active") {
    throw new CostTransitionError("Apenas um Cost recorrente ativo pode terminar.");
  }
  const validEndedOn = date(endedOn, "A data de término");
  if (!validEndedOn) throw new CostValidationError("A data de término é obrigatória.");
  if (cost.startsOn && validEndedOn < cost.startsOn) {
    throw new CostValidationError("A data de término não pode ser anterior ao início.");
  }
  return { ...cost, endedOn: validEndedOn, status: "ended" };
}

export function cancelCost(cost: Cost, cancelledOn: string): Cost {
  if (["paid", "ended", "cancelled"].includes(cost.status)) {
    throw new CostTransitionError("Este Cost já não pode ser cancelado.");
  }
  const validCancelledOn = date(cancelledOn, "A data de cancelamento");
  if (!validCancelledOn) throw new CostValidationError("A data de cancelamento é obrigatória.");
  return { ...cost, cancelledOn: validCancelledOn, status: "cancelled" };
}
