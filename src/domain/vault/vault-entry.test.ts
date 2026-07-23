import { describe, expect, test } from "vitest";

import { validateVaultEntryValues, VaultValidationError } from "./vault-entry";

describe("VaultEntry", () => {
  test("normaliza apenas os campos mínimos", () => {
    expect(
      validateVaultEntryValues({
        serviceName: " Google Workspace ",
        url: "https://accounts.google.com",
        username: " hello@vouga-agency.pt ",
        password: "secret",
        note: "Conta principal",
      }),
    ).toEqual({
      serviceName: "Google Workspace",
      url: "https://accounts.google.com/",
      secret: {
        username: "hello@vouga-agency.pt",
        password: "secret",
        note: "Conta principal",
      },
    });
  });

  test("rejeita password vazia e protocolos não web", () => {
    expect(() =>
      validateVaultEntryValues({
        serviceName: "Google",
        username: "hello@vouga-agency.pt",
        password: "",
      }),
    ).toThrow(VaultValidationError);
    expect(() =>
      validateVaultEntryValues({
        serviceName: "Google",
        url: "javascript:alert(1)",
        username: "hello@vouga-agency.pt",
        password: "secret",
      }),
    ).toThrow("Usa um URL http ou https válido.");
  });
});
