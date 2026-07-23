import { describe, expect, test } from "vitest";

import { AesVaultPayloadProtector, VaultProtectionError } from "./vault-payload-protector";

const KEY = Buffer.alloc(32, 9).toString("base64");

describe("AesVaultPayloadProtector", () => {
  test("usa AES-GCM com nonce aleatório e recupera o payload", async () => {
    const protector = new AesVaultPayloadProtector(KEY, 1);
    const secret = { username: "hello@vouga.pt", password: "secret", note: "Principal" };
    const first = await protector.protect(secret);
    const second = await protector.protect(secret);

    expect(first.ciphertext).not.toContain("secret");
    expect(first.iv).not.toBe(second.iv);
    expect(first.ciphertext).not.toBe(second.ciphertext);
    await expect(protector.reveal(first, 1)).resolves.toEqual(secret);
  });

  test("rejeita adulteração, versão e chave inválidas", async () => {
    expect(() => new AesVaultPayloadProtector("short", 1)).toThrow(VaultProtectionError);
    const protector = new AesVaultPayloadProtector(KEY, 1);
    const encrypted = await protector.protect({
      username: "hello@vouga.pt",
      password: "secret",
      note: null,
    });
    await expect(protector.reveal({ ...encrypted, ciphertext: "invalid" }, 1)).rejects.toThrow(
      VaultProtectionError,
    );
    await expect(protector.reveal(encrypted, 2)).rejects.toThrow(VaultProtectionError);
  });
});
