import { expect, test } from "vitest";

import type {
  ProtectedVaultPayload,
  StoredVaultEntry,
  VaultPayloadProtector,
  VaultRepository,
} from "./contracts";
import { VaultService } from "./vault-service";

const stored: StoredVaultEntry = {
  id: "vault-1",
  serviceName: "Google",
  url: null,
  encryptedPayload: { ciphertext: "cipher", iv: "iv" },
  keyVersion: 1,
  createdByMemberId: "member-1",
  createdAt: "2026-07-23T12:00:00.000Z",
  updatedAt: "2026-07-23T12:00:00.000Z",
};

test("VaultService cifra antes de persistir e revela apenas por ação explícita", async () => {
  let createdPayload: ProtectedVaultPayload | null = null;
  const repository: VaultRepository = {
    list: async () => [],
    findEncryptedById: async () => stored,
    create: async (values, payload, keyVersion) => {
      createdPayload = payload;
      return { ...stored, ...values, keyVersion };
    },
    delete: async () => undefined,
  };
  const protector: VaultPayloadProtector = {
    keyVersion: 1,
    protect: async () => ({ ciphertext: "protected", iv: "random" }),
    reveal: async () => ({ username: "hello@vouga.pt", password: "secret", note: null }),
  };
  const service = new VaultService(repository, protector);

  await service.createEntry({
    serviceName: "Google",
    username: "hello@vouga.pt",
    password: "secret",
  });
  expect(createdPayload).toEqual({ ciphertext: "protected", iv: "random" });
  await expect(service.revealEntry("vault-1")).resolves.toEqual({
    username: "hello@vouga.pt",
    password: "secret",
    note: null,
  });
});
