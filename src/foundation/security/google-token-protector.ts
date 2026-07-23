import "server-only";

import type { GoogleTokenProtector, ProtectedGoogleToken } from "@/application/google/contracts";

const TOKEN_KEY_VERSION = 1;

export class GoogleTokenProtectionError extends Error {
  constructor() {
    super("Não foi possível proteger a credencial Google.");
    this.name = "GoogleTokenProtectionError";
  }
}

export class AesGoogleTokenProtector implements GoogleTokenProtector {
  private readonly keyBytes: ArrayBuffer;

  constructor(encodedKey: string) {
    this.keyBytes = decodeBase64(encodedKey);
    if (this.keyBytes.byteLength !== 32) throw new GoogleTokenProtectionError();
  }

  async protect(token: string): Promise<ProtectedGoogleToken> {
    if (!token) throw new GoogleTokenProtectionError();

    try {
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const key = await this.importKey(["encrypt"]);
      const encrypted = await crypto.subtle.encrypt(
        { iv, name: "AES-GCM" },
        key,
        new TextEncoder().encode(token),
      );

      return {
        ciphertext: encodeBase64Url(new Uint8Array(encrypted)),
        iv: encodeBase64Url(iv),
        keyVersion: TOKEN_KEY_VERSION,
      };
    } catch (error) {
      if (error instanceof GoogleTokenProtectionError) throw error;
      throw new GoogleTokenProtectionError();
    }
  }

  async reveal(token: ProtectedGoogleToken): Promise<string> {
    if (token.keyVersion !== TOKEN_KEY_VERSION) throw new GoogleTokenProtectionError();

    try {
      const key = await this.importKey(["decrypt"]);
      const decrypted = await crypto.subtle.decrypt(
        { iv: decodeBase64Url(token.iv), name: "AES-GCM" },
        key,
        decodeBase64Url(token.ciphertext),
      );
      return new TextDecoder().decode(decrypted);
    } catch {
      throw new GoogleTokenProtectionError();
    }
  }

  private async importKey(usages: KeyUsage[]): Promise<CryptoKey> {
    return crypto.subtle.importKey("raw", this.keyBytes, { name: "AES-GCM" }, false, usages);
  }
}

function decodeBase64(value: string): ArrayBuffer {
  return toArrayBuffer(Buffer.from(value, "base64"));
}

function encodeBase64Url(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString("base64url");
}

function decodeBase64Url(value: string): ArrayBuffer {
  return toArrayBuffer(Buffer.from(value, "base64url"));
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy.buffer;
}
