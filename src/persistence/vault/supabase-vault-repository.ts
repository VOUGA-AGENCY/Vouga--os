import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  ProtectedVaultPayload,
  StoredVaultEntry,
  VaultRepository,
} from "@/application/vault/contracts";
import type { ValidVaultEntryValues, VaultEntry } from "@/domain/vault/vault-entry";

type MetadataRow = {
  id: string;
  service_name: string;
  url: string | null;
  key_version: number;
  created_by_member_id: string;
  created_at: string;
  updated_at: string;
};

type EncryptedRow = MetadataRow & {
  encrypted_payload: ProtectedVaultPayload;
};

export class VaultPersistenceError extends Error {
  constructor(message = "Não foi possível aceder ao Vault.") {
    super(message);
    this.name = "VaultPersistenceError";
  }
}

export class SupabaseVaultRepository implements VaultRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async list(): Promise<VaultEntry[]> {
    const { data, error } = await this.supabase.rpc("list_vault_entries");
    if (error) throw persistenceError(error);
    return ((data ?? []) as MetadataRow[]).map(toMetadata);
  }

  async findEncryptedById(id: string): Promise<StoredVaultEntry | null> {
    const { data, error } = await this.supabase.rpc("get_vault_entry_ciphertext", {
      p_vault_entry_id: id,
    });
    if (error) throw persistenceError(error);
    return data ? toStored(data as EncryptedRow) : null;
  }

  async create(
    values: Pick<ValidVaultEntryValues, "serviceName" | "url">,
    encryptedPayload: ProtectedVaultPayload,
    keyVersion: number,
  ): Promise<VaultEntry> {
    const { data, error } = await this.supabase.rpc("create_vault_entry", {
      p_service_name: values.serviceName,
      p_url: values.url,
      p_encrypted_payload: encryptedPayload,
      p_key_version: keyVersion,
    });
    if (error || typeof data !== "string") throw persistenceError(error);
    const entry = (await this.list()).find((item) => item.id === data);
    if (!entry) throw new VaultPersistenceError();
    return entry;
  }

  async delete(id: string): Promise<void> {
    const { error } = await this.supabase.rpc("delete_vault_entry", {
      p_vault_entry_id: id,
    });
    if (error) throw persistenceError(error);
  }
}

function persistenceError(error: { code?: string; message?: string } | null) {
  const missingMigration =
    ["42P01", "42883", "PGRST202"].includes(error?.code ?? "") ||
    /list_vault_entries|vault_entries/i.test(error?.message ?? "");
  return new VaultPersistenceError(
    missingMigration
      ? "Falta aplicar a migration do Vault no Supabase."
      : "Não foi possível aceder ao Vault.",
  );
}

function toMetadata(row: MetadataRow): VaultEntry {
  return {
    id: row.id,
    serviceName: row.service_name,
    url: row.url,
    keyVersion: Number(row.key_version),
    createdByMemberId: row.created_by_member_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toStored(row: EncryptedRow): StoredVaultEntry {
  return {
    ...toMetadata(row),
    encryptedPayload: {
      ciphertext: row.encrypted_payload.ciphertext,
      iv: row.encrypted_payload.iv,
    },
  };
}
