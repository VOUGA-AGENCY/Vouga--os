import { describe, expect, test } from "vitest";

import { AesGoogleTokenProtector, GoogleTokenProtectionError } from "./google-token-protector";

const KEY = Buffer.alloc(32, 7).toString("base64");

describe("AesGoogleTokenProtector", () => {
  test("cifra com nonce aleatório e recupera o token", async () => {
    const protector = new AesGoogleTokenProtector(KEY);
    const first = await protector.protect("refresh-secret");
    const second = await protector.protect("refresh-secret");

    expect(first.ciphertext).not.toBe("refresh-secret");
    expect(first.ciphertext).not.toBe(second.ciphertext);
    expect(first.iv).not.toBe(second.iv);
    await expect(protector.reveal(first)).resolves.toBe("refresh-secret");
  });

  test("rejeita chave e versão inválidas", async () => {
    expect(() => new AesGoogleTokenProtector("short")).toThrow(GoogleTokenProtectionError);
    const protector = new AesGoogleTokenProtector(KEY);
    await expect(
      protector.reveal({ ciphertext: "invalid", iv: "invalid", keyVersion: 2 }),
    ).rejects.toBeInstanceOf(GoogleTokenProtectionError);
  });
});
