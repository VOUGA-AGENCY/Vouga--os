import { describe, expect, it } from "vitest";

import type { GlobalContextSnapshot } from "./global-context";
import { exportGlobalContextToMarkdown } from "./export-markdown";

describe("global context Markdown", () => {
  it("exports only factual LLM context and resolves relations to names", () => {
    const snapshot = {
      companies: [
        {
          id: "company-id",
          name: "Oxiarte, Lda",
          status: "active",
          ownerDisplayName: "Miguel",
          ownerEmail: "miguel@vouga-agency.pt",
          primaryCae: "25620",
          contactEmail: null,
          contactPhone: "+351 256 000 000",
          website: "https://oxiarte.pt",
          currentContext: "Produção industrial com oportunidade de digitalização.",
          relationshipRisks: null,
          prospectingStage: "to_contact",
          primaryContactId: "contact-id",
          updatedAt: "2026-09-01T10:00:00Z",
        },
      ],
      contacts: [
        {
          id: "contact-id",
          displayName: "Renato",
          companyName: "Oxiarte, Lda",
          companyId: "company-id",
          ownerDisplayName: "Miguel",
          relationshipRole: "prospect",
          jobTitle: "Dono",
          email: null,
          linkedinUrl: null,
          phone: "+351 910 000 000",
          importantContext: "Prefere contacto telefónico.",
          avatarUrl: null,
          strategicAt: null,
          status: "active",
          lastContactAt: null,
          hasReplied: false,
        },
      ],
      projects: [
        {
          id: "project-id",
          name: "Oxiarte Operations",
          status: "in_progress",
          client: { id: "company-id", name: "Oxiarte, Lda" },
          owner: { id: "member-id", displayName: "Miguel" },
          startsOn: "2026-09-01",
          targetDeliveryOn: "2026-10-15",
          agreedAmountMinor: 400000,
          receivedAmountMinor: 0,
          currency: "EUR",
          objective: "Digitalizar a operação.",
          expectedResult: "Fluxo operacional validado.",
          nextTask: {
            id: "task-id",
            title: "Validar fluxo",
            status: "in_progress",
            ownerDisplayName: "Miguel",
            dueAt: "2026-09-10",
            completedAt: null,
          },
          updatedAt: "2026-09-01T10:00:00Z",
        },
      ],
      interactions: [
        {
          id: "interaction-id",
          companyId: "company-id",
          companyName: "Oxiarte, Lda",
          contactId: "contact-id",
          contactName: "Renato",
          direction: "outbound",
          channel: "call",
          body: "Apresentada a abordagem system-first.",
          occurredAt: "2026-09-02T09:30:00Z",
          recorderName: "Miguel",
        },
      ],
      tasks: [
        {
          id: "task-id",
          title: "Validar fluxo",
          expectedResult: null,
          purpose: "work",
          status: "in_progress",
          ownerMemberId: "member-id",
          ownerDisplayName: "Miguel",
          dueAt: "2026-09-10",
          blockedReason: null,
          blockedNextMove: null,
          originLabel: "Planeamento",
          originMeetingId: null,
          originDecisionId: null,
          companyIds: ["company-id"],
          companyNames: ["Oxiarte, Lda"],
          meetingIds: [],
          meetingTitles: [],
          decisionIds: [],
          decisionTitles: [],
          updatedAt: "2026-09-01T10:00:00Z",
        },
      ],
    } satisfies GlobalContextSnapshot;

    const markdown = exportGlobalContextToMarkdown(snapshot);

    expect(markdown).toContain("# VOUGA — GLOBAL CONTEXT");
    expect(markdown).toContain("A Vouga Agency é uma consultora tecnológica portuguesa");
    expect(markdown).toContain("### Oxiarte, Lda");
    expect(markdown).toContain("- Estado: Por contactar");
    expect(markdown).toContain("- Notas: Produção industrial com oportunidade de digitalização.");
    expect(markdown).toContain("- Organização: Oxiarte, Lda");
    expect(markdown).toContain("## Interações recentes");
    expect(markdown).toContain("- Responsável: Miguel");
    expect(markdown).toContain("## Tarefas ativas");
    expect(markdown).not.toContain("company-id");
    expect(markdown).not.toContain("Custos");
    expect(markdown).not.toContain("Relações Operacionais");
  });

  it("omits empty fields instead of manufacturing content", () => {
    const markdown = exportGlobalContextToMarkdown({
      companies: [],
      contacts: [],
      projects: [],
      interactions: [],
      tasks: [],
    });
    expect(markdown).not.toContain("Telefone:");
    expect(markdown).not.toContain("undefined");
    expect(markdown).toContain("_Nenhum registo relevante._");
  });
});
