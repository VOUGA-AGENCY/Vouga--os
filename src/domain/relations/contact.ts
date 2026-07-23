export const CONTACT_ROLES = [
  "investor",
  "advisor",
  "client",
  "prospect",
  "partner",
  "supplier",
  "other",
] as const;
export const CONTACT_CHANNELS = ["email", "linkedin", "call"] as const;
export type ContactRole = (typeof CONTACT_ROLES)[number];
export type ContactChannel = (typeof CONTACT_CHANNELS)[number];
export type ContactDirection = "inbound" | "outbound";
export type ContactStatus = "active" | "archived";

export const CONTACT_ROLE_LABELS: Record<ContactRole, string> = {
  investor: "Investidor",
  advisor: "Advisor",
  client: "Cliente",
  prospect: "Prospect",
  partner: "Parceiro",
  supplier: "Fornecedor",
  other: "Outro",
};
export const CONTACT_CHANNEL_LABELS: Record<ContactChannel, string> = {
  email: "Email",
  linkedin: "LinkedIn",
  call: "Chamada",
};

export type ContactValues = {
  displayName: string;
  companyId?: string | null;
  ownerMemberId: string;
  relationshipRole: ContactRole;
  jobTitle?: string | null;
  email?: string | null;
  linkedinUrl?: string | null;
  phone?: string | null;
  avatarUrl?: string | null;
  importantContext?: string | null;
};
export type ValidContactValues = Readonly<{
  displayName: string;
  companyId: string | null;
  ownerMemberId: string;
  relationshipRole: ContactRole;
  jobTitle: string | null;
  email: string | null;
  linkedinUrl: string | null;
  phone: string | null;
  avatarUrl: string | null;
  importantContext: string | null;
}>;
export type Contact = ValidContactValues &
  Readonly<{
    id: string;
    strategicAt: string | null;
    status: ContactStatus;
    createdAt: string;
    updatedAt: string;
  }>;

export class ContactValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ContactValidationError";
  }
}

const optional = (value: string | null | undefined, max: number, label: string) => {
  const result = value?.trim() || null;
  if (result && result.length > max)
    throw new ContactValidationError(`${label} excede ${max} caracteres.`);
  return result;
};

export function validateContactValues(values: ContactValues): ValidContactValues {
  const displayName = values.displayName.trim();
  if (!displayName) throw new ContactValidationError("O nome é obrigatório.");
  if (displayName.length > 160) throw new ContactValidationError("O nome excede 160 caracteres.");
  if (!values.ownerMemberId.trim()) throw new ContactValidationError("Seleciona um owner.");
  if (!CONTACT_ROLES.includes(values.relationshipRole))
    throw new ContactValidationError("A relação não é válida.");
  const email = optional(values.email, 320, "O email")?.toLocaleLowerCase("pt-PT") ?? null;
  if (email && !/^\S+@\S+\.\S+$/.test(email))
    throw new ContactValidationError("O email não é válido.");
  const linkedinUrl = optional(values.linkedinUrl, 500, "O LinkedIn");
  if (linkedinUrl && !/^https:\/\/(www\.)?linkedin\.com\//i.test(linkedinUrl))
    throw new ContactValidationError("Usa um URL HTTPS do LinkedIn.");
  const avatarUrl = optional(values.avatarUrl, 350_000, "O avatar");
  if (avatarUrl && !avatarUrl.startsWith("https://") && !avatarUrl.startsWith("data:image/"))
    throw new ContactValidationError("O avatar deve usar HTTPS ou uma imagem importada.");
  return {
    displayName,
    companyId: optional(values.companyId, 100, "A organização"),
    ownerMemberId: values.ownerMemberId.trim(),
    relationshipRole: values.relationshipRole,
    jobTitle: optional(values.jobTitle, 160, "A função"),
    email,
    linkedinUrl,
    phone: optional(values.phone, 80, "O telefone"),
    avatarUrl,
    importantContext: optional(values.importantContext, 6000, "O contexto importante"),
  };
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}
