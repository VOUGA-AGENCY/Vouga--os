import type { ValidVaultEntryValues, VaultEntry, VaultSecret } from "@/domain/vault/vault-entry";

export type ProtectedVaultPayload = Readonly<{
  ciphertext: string;
  iv: string;
}>;

export type StoredVaultEntry = VaultEntry &
  Readonly<{
    encryptedPayload: ProtectedVaultPayload;
  }>;

export interface VaultPayloadProtector {
  protect(secret: VaultSecret): Promise<ProtectedVaultPayload>;
  reveal(payload: ProtectedVaultPayload, keyVersion: number): Promise<VaultSecret>;
  readonly keyVersion: number;
}

export interface VaultRepository {
  list(): Promise<VaultEntry[]>;
  findEncryptedById(id: string): Promise<StoredVaultEntry | null>;
  create(
    values: Pick<ValidVaultEntryValues, "serviceName" | "url">,
    encryptedPayload: ProtectedVaultPayload,
    keyVersion: number,
  ): Promise<VaultEntry>;
  delete(id: string): Promise<void>;
}
