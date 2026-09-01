export const COMPANY_STATUSES = ["active", "inactive", "archived"] as const;
export const PROSPECTING_STAGES = [
  "to_contact",
  "contacted",
  "replied",
  "meeting_scheduled",
  "not_interested",
  "agreed",
] as const;

export type CompanyStatus = (typeof COMPANY_STATUSES)[number];
export type ProspectingStage = (typeof PROSPECTING_STAGES)[number];

export const PROSPECTING_STAGE_LABELS: Record<ProspectingStage, string> = {
  to_contact: "Por contactar",
  contacted: "Contactado",
  replied: "Em conversa",
  meeting_scheduled: "Proposta",
  not_interested: "Perdido ou arquivado",
  agreed: "Acordo",
};

export const COMPANY_STATUS_LABELS: Record<CompanyStatus, string> = {
  active: "Ativa",
  inactive: "Inativa",
  archived: "Arquivada",
};

export type Company = Readonly<{
  id: string;
  name: string;
  status: CompanyStatus;
  ownerMemberId: string;
  currentContext: string | null;
  relationshipRisks: string | null;
  prospectingStage: ProspectingStage | null;
  primaryContactId: string | null;
  createdAt: string;
  updatedAt: string;
}>;

export type CompanyValues = {
  name: string;
  status: CompanyStatus;
  ownerMemberId: string;
  currentContext?: string | null;
  relationshipRisks?: string | null;
  prospectingStage?: ProspectingStage | null;
  primaryContactId?: string | null;
};

export type ValidCompanyValues = Readonly<{
  name: string;
  status: CompanyStatus;
  ownerMemberId: string;
  currentContext: string | null;
  relationshipRisks: string | null;
  prospectingStage: ProspectingStage | null;
  primaryContactId: string | null;
}>;

export class CompanyValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CompanyValidationError";
  }
}

const RESERVED_VOUGA_NAMES = new Set([
  "vouga",
  "a vouga",
  "vouga agency",
  "vouga lda",
  "vouga agency lda",
]);

function requiredText(value: string, label: string, maximum: number): string {
  const normalized = value.trim();
  if (!normalized) throw new CompanyValidationError(`${label} é obrigatório.`);
  if (normalized.length > maximum) {
    throw new CompanyValidationError(`${label} não pode exceder ${maximum} caracteres.`);
  }
  return normalized;
}

function optionalText(value: string | null | undefined, label: string): string | null {
  const normalized = value?.trim() ?? "";
  if (!normalized) return null;
  if (normalized.length > 4000) {
    throw new CompanyValidationError(`${label} não pode exceder 4000 caracteres.`);
  }
  return normalized;
}

function normalizedIdentity(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-PT")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function validateCompanyValues(values: CompanyValues): ValidCompanyValues {
  const name = requiredText(values.name, "O nome", 160);
  const ownerMemberId = requiredText(values.ownerMemberId, "O owner", 100);

  if (!COMPANY_STATUSES.includes(values.status)) {
    throw new CompanyValidationError("O estado da Organisation não é válido.");
  }

  if (values.prospectingStage && !PROSPECTING_STAGES.includes(values.prospectingStage)) {
    throw new CompanyValidationError("O estado de prospeção não é válido.");
  }

  if (RESERVED_VOUGA_NAMES.has(normalizedIdentity(name))) {
    throw new CompanyValidationError("A própria Vouga não pode ser registada como Organisation.");
  }

  return {
    name,
    status: values.status,
    ownerMemberId,
    currentContext: optionalText(values.currentContext, "O contexto atual"),
    relationshipRisks: optionalText(values.relationshipRisks, "Os riscos da relação"),
    prospectingStage: values.prospectingStage ?? null,
    primaryContactId: optionalText(values.primaryContactId, "O Contact principal"),
  };
}

export function archiveCompany(company: Company): Company {
  return company.status === "archived" ? company : { ...company, status: "archived" };
}
