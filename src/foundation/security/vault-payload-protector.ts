import "server-only";

import type { ProtectedVaultPayload, VaultPayloadProtector } from "@/application/vault/contracts";
import type { VaultSecret } from "@/domain/vault/vault-entry";

export class VaultProtectionError extends Error {
  constructor() {
    super("Não foi possível proteger a credencial do Vault.");
    this.name = "VaultProtectionError";
  }
}

export class AesVaultPayloadProtector implements VaultPayloadProtector {
  private readonly keyBytes: ArrayBuffer;

  constructor(
    encodedKey: string,
    readonly keyVersion: number,
  ) {
    this.keyBytes = toArrayBuffer(Buffer.from(encodedKey, "base64"));
    if (this.keyBytes.byteLength !== 32 || !Number.isInteger(keyVersion) || keyVersion < 1)
      throw new VaultProtectionError();
  }

  async protect(secret: VaultSecret): Promise<ProtectedVaultPayload> {
    try {
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const key = await this.importKey(["encrypt"]);
      const ciphertext = await crypto.subtle.encrypt(
        { additionalData: this.additionalData(), iv, name: "AES-GCM" },
        key,
        new TextEncoder().encode(JSON.stringify(secret)),
      );
      return {
        ciphertext: Buffer.from(ciphertext).toString("base64url"),
        iv: Buffer.from(iv).toString("base64url"),
      };
    } catch {
      throw new VaultProtectionError();
    }
  }

  async reveal(payload: ProtectedVaultPayload, keyVersion: number): Promise<VaultSecret> {
    if (keyVersion !== this.keyVersion) throw new VaultProtectionError();
    try {
      const key = await this.importKey(["decrypt"]);
      const decrypted = await crypto.subtle.decrypt(
        {
          additionalData: this.additionalData(),
          iv: toArrayBuffer(Buffer.from(payload.iv, "base64url")),
          name: "AES-GCM",
        },
        key,
        toArrayBuffer(Buffer.from(payload.ciphertext, "base64url")),
      );
      const parsed = JSON.parse(new TextDecoder().decode(decrypted)) as Partial<VaultSecret>;
      if (
        typeof parsed.username !== "string" ||
        typeof parsed.password !== "string" ||
        (parsed.note !== null && typeof parsed.note !== "string")
      )
        throw new Error();
      return { username: parsed.username, password: parsed.password, note: parsed.note ?? null };
    } catch {
      throw new VaultProtectionError();
    }
  }

  private additionalData() {
    return new TextEncoder().encode(`vouga-vault:v${this.keyVersion}`);
  }

  private importKey(usages: KeyUsage[]) {
    return crypto.subtle.importKey("raw", this.keyBytes, { name: "AES-GCM" }, false, usages);
  }
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy.buffer;
}
