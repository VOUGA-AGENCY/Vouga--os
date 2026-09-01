import { describe, expect, it } from "vitest";

import { validateProjectValues } from "@/domain/projects/project";
import { PROSPECTING_STAGE_LABELS, PROSPECTING_STAGES } from "@/domain/companies/company";

describe("Conversão Comercial → Entrega (Fechar Contrato)", () => {
  it("valida a criação de um Project a partir de um acordo fechado", () => {
    const valid = validateProjectValues({
      name: "Acme Corp — Entrega",
      clientCompanyId: "company-1",
      ownerMemberId: "member-1",
      startsOn: "2026-09-01",
      targetDeliveryOn: "2026-10-01",
      agreedAmountMinor: 500000,
      receivedAmountMinor: 100000,
      currency: "EUR",
      objective: "Desenvolver o novo website institucional.",
      expectedResult: "Website em produção com testes aprovados.",
      teamMemberIds: ["member-1"],
      contactIds: ["contact-1", "contact-2"],
    });

    expect(valid.name).toBe("Acme Corp — Entrega");
    expect(valid.clientCompanyId).toBe("company-1");
    expect(valid.agreedAmountMinor).toBe(500000);
    expect(valid.receivedAmountMinor).toBe(100000);
    expect(valid.contactIds).toEqual(["contact-1", "contact-2"]);
    expect(valid.teamMemberIds).toEqual(["member-1"]);
  });

  it("rejeita Project sem valor acordado ou com valor inválido", () => {
    expect(() =>
      validateProjectValues({
        name: "Acme Corp — Entrega",
        clientCompanyId: "company-1",
        ownerMemberId: "member-1",
        startsOn: "2026-09-01",
        targetDeliveryOn: "2026-10-01",
        agreedAmountMinor: 0,
        currency: "EUR",
        objective: "Objetivo",
        expectedResult: "Resultado",
      }),
    ).toThrow("O valor acordado tem de ser positivo.");
  });

  it("rejeita Project sem nome ou sem cliente", () => {
    expect(() =>
      validateProjectValues({
        name: "",
        clientCompanyId: "company-1",
        ownerMemberId: "member-1",
        startsOn: "2026-09-01",
        targetDeliveryOn: "2026-10-01",
        agreedAmountMinor: 10000,
        currency: "EUR",
        objective: "Objetivo",
        expectedResult: "Resultado",
      }),
    ).toThrow("O nome é obrigatório.");

    expect(() =>
      validateProjectValues({
        name: "Acme Project",
        clientCompanyId: "",
        ownerMemberId: "member-1",
        startsOn: "2026-09-01",
        targetDeliveryOn: "2026-10-01",
        agreedAmountMinor: 10000,
        currency: "EUR",
        objective: "Objetivo",
        expectedResult: "Resultado",
      }),
    ).toThrow("O cliente é obrigatório.");
  });

  it("mantém a fase 'agreed' como Acordo no pipeline comercial", () => {
    expect(PROSPECTING_STAGES).toContain("agreed");
    expect(PROSPECTING_STAGE_LABELS.agreed).toBe("Acordo");
  });
});
