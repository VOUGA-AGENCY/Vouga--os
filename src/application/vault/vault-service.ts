import {
  validateVaultEntryValues,
  type VaultEntryValues,
  VaultValidationError,
} from "@/domain/vault/vault-entry";
import type { VaultPayloadProtector, VaultRepository } from "./contracts";

export class VaultNotFoundError extends Error {
  constructor() {
    super("A credencial já não existe.");
    this.name = "VaultNotFoundError";
  }
}

export class VaultService {
  constructor(
    private readonly repository: VaultRepository,
    private readonly protector: VaultPayloadProtector,
  ) {}

  listEntries() {
    return this.repository.list();
  }

  async createEntry(values: VaultEntryValues) {
    const valid = validateVaultEntryValues(values);
    const encrypted = await this.protector.protect(valid.secret);
    return this.repository.create(valid, encrypted, this.protector.keyVersion);
  }

  async revealEntry(id: string) {
    const entry = await this.repository.findEncryptedById(id);
    if (!entry) throw new VaultNotFoundError();
    return this.protector.reveal(entry.encryptedPayload, entry.keyVersion);
  }

  async deleteEntry(id: string) {
    const entry = await this.repository.findEncryptedById(id);
    if (!entry) throw new VaultNotFoundError();
    await this.repository.delete(id);
  }
}

export function getVaultApplicationErrorMessage(error: unknown) {
  if (
    error instanceof VaultValidationError ||
    error instanceof VaultNotFoundError ||
    (error instanceof Error &&
      ["VaultPersistenceError", "VaultProtectionError", "VaultConfigurationError"].includes(
        error.name,
      ))
  )
    return error.message;
  return "Não foi possível concluir a operação no Vault.";
}
