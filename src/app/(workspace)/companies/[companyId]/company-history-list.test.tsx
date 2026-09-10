import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { CompanyInteractionItem } from "@/projections/relations/relations-read-model";
import { CompanyHistoryList } from "./company-history-list";

describe("CompanyHistoryList", () => {
  it("renders empty state message when there are no interactions", () => {
    const html = renderToStaticMarkup(
      <CompanyHistoryList companyHref="/companies/comp-1" history={[]} />,
    );
    expect(html).toContain("Ainda não existem interações");
  });

  it("renders interaction items with contact name link, preview and toggle chevron", () => {
    const item: CompanyInteractionItem = {
      body: "Email inicial de apresentação da agência.",
      channel: "email",
      contactId: "contact-1",
      contactName: "Ana Silva",
      id: "int-1",
      occurredAt: "2026-09-02T10:00:00Z",
    };

    const html = renderToStaticMarkup(
      <CompanyHistoryList companyHref="/companies/comp-1" history={[item]} />,
    );
    expect(html).toContain("Email");
    expect(html).toContain("Ana Silva");
    expect(html).toContain("Email inicial de apresentação da agência.");
    expect(html).toContain("crm-company-history-contact-link");
    expect(html).toContain("crm-company-history-toggle");
    expect(html).toContain("crm-company-history-preview");
  });

  it("renders toggle button with accessible label", () => {
    const item: CompanyInteractionItem = {
      body: "Telefonema com notas detalhadas.",
      channel: "call",
      contactId: null,
      contactName: null,
      id: "int-2",
      occurredAt: "2026-09-02T15:30:00Z",
    };

    const html = renderToStaticMarkup(
      <CompanyHistoryList companyHref="/companies/comp-1" history={[item]} />,
    );
    expect(html).toContain("Chamada");
    expect(html).toContain("Sem perfil específico");
    expect(html).toContain("crm-company-history-toggle");
    expect(html).toContain('aria-label="Expandir registo"');
  });
});
