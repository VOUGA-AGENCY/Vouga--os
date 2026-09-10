import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { ContactInteractionItem } from "@/projections/relations/relations-read-model";
import { ContactHistoryList } from "./contact-history-list";

describe("ContactHistoryList", () => {
  it("renders empty state message when there are no interactions", () => {
    const html = renderToStaticMarkup(<ContactHistoryList interactions={[]} />);
    expect(html).toContain("Ainda não existem interações");
  });

  it("renders interaction items with channel label, recorder and body", () => {
    const item: ContactInteractionItem = {
      body: "Conversa telefónica de alinhamento.",
      channel: "call",
      companyId: "comp-1",
      contactId: "cont-1",
      direction: "outbound",
      hasReply: false,
      id: "int-1",
      occurredAt: "2026-09-02T10:00:00Z",
      recorderName: "Vasco Magolo",
      replyToInteractionId: null,
    };

    const html = renderToStaticMarkup(<ContactHistoryList interactions={[item]} />);
    expect(html).toContain("Chamada");
    expect(html).toContain("Conversa telefónica de alinhamento.");
    expect(html).toContain("Vasco Magolo");
    expect(html).toContain("crm-interaction-card");
    // Short message does not need expand button
    expect(html).not.toContain("Ver log completo");
  });

  it("renders expand button for long interaction logs", () => {
    const longBody =
      "Reunião alargada de diagnóstico. Discutimos os seguintes pontos:\n" +
      "1. Estrutura atual da pipeline e principais pontos de fricção no onboarding de novos clientes.\n" +
      "2. Necessidade de automatização nas transições contratuais para o módulo de Work.\n" +
      "3. Estimativa de entrega e próximos passos para validação técnica.";

    const item: ContactInteractionItem = {
      body: longBody,
      channel: "email",
      companyId: "comp-1",
      contactId: "cont-1",
      direction: "inbound",
      hasReply: true,
      id: "int-2",
      occurredAt: "2026-09-02T11:00:00Z",
      recorderName: "Miguel",
      replyToInteractionId: null,
    };

    const html = renderToStaticMarkup(<ContactHistoryList interactions={[item]} />);
    expect(html).toContain("Email");
    expect(html).toContain("crm-interaction-expand-btn");
    expect(html).toContain("Ver log completo");
    expect(html).toContain("· com resposta");
    expect(html).toContain("crm-interaction-body-clamped");
  });
});
