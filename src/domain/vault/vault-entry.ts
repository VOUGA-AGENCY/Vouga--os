export type VaultSecret = Readonly<{
  username: string;
  password: string;
  note: string | null;
}>;

export type VaultEntryValues = Readonly<{
  serviceName: string;
  url?: string | null;
  username: string;
  password: string;
  note?: string | null;
}>;

export type ValidVaultEntryValues = Readonly<{
  serviceName: string;
  url: string | null;
  secret: VaultSecret;
}>;

export type VaultEntry = Readonly<{
  id: string;
  serviceName: string;
  url: string | null;
  keyVersion: number;
  createdByMemberId: string;
  createdAt: string;
  updatedAt: string;
}>;

export class VaultValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "VaultValidationError";
  }
}

export function validateVaultEntryValues(values: VaultEntryValues): ValidVaultEntryValues {
  const serviceName = bounded(values.serviceName, 1, 120, "Indica o serviço.");
  const username = bounded(values.username, 1, 320, "Indica o username ou email.");
  const password = bounded(values.password, 1, 4096, "Indica a password.");
  const note = optional(values.note, 1000, "A nota é demasiado longa.");
  const url = validUrl(values.url);
  return { serviceName, url, secret: { username, password, note } };
}

function bounded(value: string, min: number, max: number, message: string) {
  const normalized = value.trim();
  if (normalized.length < min || normalized.length > max) throw new VaultValidationError(message);
  return normalized;
}

function optional(value: string | null | undefined, max: number, message: string) {
  const normalized = value?.trim() ?? "";
  if (!normalized) return null;
  if (normalized.length > max) throw new VaultValidationError(message);
  return normalized;
}

function validUrl(value: string | null | undefined) {
  const normalized = value?.trim() ?? "";
  if (!normalized) return null;
  try {
    const url = new URL(normalized);
    if (!["http:", "https:"].includes(url.protocol)) throw new Error();
    return url.toString();
  } catch {
    throw new VaultValidationError("Usa um URL http ou https válido.");
  }
}
