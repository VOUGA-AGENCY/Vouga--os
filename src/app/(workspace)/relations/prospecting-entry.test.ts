import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const relationsPage = readFileSync(new URL("./page.tsx", import.meta.url), "utf8");
const companyForm = readFileSync(new URL("../companies/company-form.tsx", import.meta.url), "utf8");
const interactionModal = readFileSync(new URL("./interaction-modal.tsx", import.meta.url), "utf8");

describe("entrada de Organizações pela prospeção", () => {
  it("abre a criação em Por contactar e remove Interno da superfície", () => {
    expect(relationsPage).toContain('withReturnTo("/companies/new?prospecting=1", currentHref)');
    expect(relationsPage).not.toContain('href="/relations?segment=internal"');
  });

  it("não oferece Fora da prospeção e mantém Por contactar como default", () => {
    expect(companyForm).toContain(
      'defaultProspectingStage ? null : <option value="">Fora da prospeção</option>',
    );
    expect(companyForm).toContain('company?.prospectingStage ?? defaultProspectingStage ?? ""');
  });

  it("remove Interno do contrato visível de Contacts", () => {
    expect(relationsPage).not.toContain('"internal"');
    expect(interactionModal).not.toContain('"internal"');
    expect(interactionModal).not.toContain("Novo por contactar");
  });

  it("abre o histórico oficial da Organisation e preserva a vista de origem", () => {
    expect(relationsPage).toContain("withReturnTo(`/companies/${row.companyId}`, returnTo)");
    expect(relationsPage).not.toContain("row.primaryContactId\n          ?");
  });
});
