import { describe, expect, it } from "vitest";

import {
  archiveCompany,
  COMPANY_STATUSES,
  PROSPECTING_STAGE_LABELS,
  PROSPECTING_STAGES,
  type Company,
  CompanyValidationError,
  validateCompanyValues,
} from "./company";

const company: Company = {
  id: "company-1",
  name: "Empresa Externa",
  status: "active",
  ownerMemberId: "member-1",
  currentContext: null,
  relationshipRisks: null,
  prospectingStage: null,
  primaryContactId: null,
  createdAt: "2026-07-15T00:00:00.000Z",
  updatedAt: "2026-07-15T00:00:00.000Z",
};

describe("Company", () => {
  it("aceita apenas os três estados aprovados", () => {
    expect(COMPANY_STATUSES).toEqual(["active", "inactive", "archived"]);
    expect(() =>
      validateCompanyValues({
        name: "Empresa Externa",
        status: "pipeline" as "active",
        ownerMemberId: "member-1",
      }),
    ).toThrow("O estado da Organisation não é válido.");
  });

  it("expõe os seis estados aprovados para Contacts", () => {
    expect(PROSPECTING_STAGES).toEqual([
      "to_contact",
      "contacted",
      "replied",
      "meeting_scheduled",
      "not_interested",
      "agreed",
    ]);
    expect(PROSPECTING_STAGE_LABELS).toEqual({
      to_contact: "Por contactar",
      contacted: "Contactados",
      replied: "A Responder",
      meeting_scheduled: "Agendado",
      not_interested: "Não avançou",
      agreed: "Acordado",
    });
  });

  it("normaliza campos opcionais vazios sem inventar informação", () => {
    expect(
      validateCompanyValues({
        name: "  Empresa Externa  ",
        status: "active",
        ownerMemberId: "member-1",
        currentContext: "  ",
        relationshipRisks: " risco material ",
      }),
    ).toEqual({
      name: "Empresa Externa",
      status: "active",
      ownerMemberId: "member-1",
      currentContext: null,
      relationshipRisks: "risco material",
      prospectingStage: null,
      primaryContactId: null,
    });
  });

  it.each([
    ["nome", { name: "", status: "active", ownerMemberId: "member-1" }],
    ["owner", { name: "Empresa Externa", status: "active", ownerMemberId: "" }],
  ])("rejeita ausência de %s", (_field, values) => {
    expect(() =>
      validateCompanyValues(values as Parameters<typeof validateCompanyValues>[0]),
    ).toThrow(CompanyValidationError);
  });

  it.each(["Vouga", "A Vouga", "Vouga Agency", "vouga-agency, lda"])(
    "impede registar a própria Vouga como %s",
    (name) => {
      expect(() =>
        validateCompanyValues({ name, status: "active", ownerMemberId: "member-1" }),
      ).toThrow("A própria Vouga não pode ser registada como Organisation.");
    },
  );

  it("arquiva sem eliminar identidade ou contexto", () => {
    expect(archiveCompany({ ...company, currentContext: "Relação em avaliação" })).toEqual({
      ...company,
      currentContext: "Relação em avaliação",
      status: "archived",
    });
  });
});
