import { describe, expect, it } from "vitest";

import type { ObjectContext } from "./context-engine";
import { exportContextToMarkdown, exportGraphToMarkdown } from "./export-markdown";

describe("exportContextToMarkdown", () => {
  const mockContext: ObjectContext = {
    target: { type: "company", id: "comp-1" },
    isPartial: false,
    sections: [
      {
        id: "contacts",
        title: "Perfis da Organização",
        source: "public.contacts",
        status: "ready",
        message: null,
        items: [
          {
            id: "c-1",
            label: "Ana Silva",
            href: "/relations/contacts/c-1",
            meta: "Diretora de Operações",
          },
        ],
      },
      {
        id: "tasks",
        title: "Tarefas em Curso",
        source: "public.tasks",
        status: "ready",
        message: null,
        items: [
          {
            id: "t-1",
            label: "Apresentar proposta",
            href: "/tasks/t-1",
            meta: "Em curso",
          },
        ],
      },
    ],
  };

  it("exporta cabeçalho, fontes oficiais e metadados", () => {
    const md = exportContextToMarkdown(mockContext, {
      targetTitle: "Acme Indústria",
      generatedAt: "2026-09-01T12:00:00.000Z",
    });

    expect(md).toContain("# Contexto Operacional: Acme Indústria");
    expect(md).toContain("> **Data de Geração:** 2026-09-01T12:00:00.000Z");
    expect(md).toContain("> **Origem:** Vouga OS Context Engine");
    expect(md).toContain("> **Integridade:** Completo");
    expect(md).toContain("## Perfis da Organização");
    expect(md).toContain("*Fonte oficial: public.contacts*");
    expect(md).toContain("- **Ana Silva** — *Diretora de Operações* [/relations/contacts/c-1]");
    expect(md).toContain("## Tarefas em Curso");
    expect(md).toContain("*Fonte oficial: public.tasks*");
    expect(md).toContain("- **Apresentar proposta** — *Em curso* [/tasks/t-1]");
  });

  it("indica integridade parcial e avisos de fontes quando há erros", () => {
    const partialContext: ObjectContext = {
      ...mockContext,
      isPartial: true,
      sections: [
        ...mockContext.sections,
        {
          id: "google-sync",
          title: "Sincronização Google",
          source: "api.google.calendar",
          status: "error",
          message: "Token expirado.",
          items: [],
        },
      ],
    };

    const md = exportContextToMarkdown(partialContext, {
      targetTitle: "Acme Indústria",
    });

    expect(md).toContain("> **Integridade:** Parcial (algumas fontes indisponíveis)");
    expect(md).toContain("## Sincronização Google");
    expect(md).toContain("> ⚠️ **Aviso de Fonte:** Token expirado.");
  });

  it("exporta o grafo operacional global com resumo por tipo e arestas", () => {
    const md = exportGraphToMarkdown(
      {
        nodes: [
          {
            id: "comp-1",
            type: "company",
            label: "Vouga Agency",
            sublabel: "Ativa",
            status: "active",
            href: "/companies/comp-1",
            layer: 1,
            connectionsCount: 2,
          },
          {
            id: "task-1",
            type: "task",
            label: "Redesign Vouga",
            sublabel: "Em curso",
            status: "in_progress",
            href: "/tasks/task-1",
            layer: 2,
            connectionsCount: 1,
          },
        ],
        edges: [
          {
            id: "e-1",
            source: "comp-1",
            target: "task-1",
            relation: "assigned_to",
          },
        ],
        stats: {
          totalEntities: 2,
          totalConnections: 1,
          densityScore: 0.5,
          activeClusters: 2,
        },
      },
      { generatedAt: "2026-09-01T15:00:00.000Z" },
    );

    expect(md).toContain("# Contexto Operacional Global — Vouga OS");
    expect(md).toContain("> **Entidades:** 2 | **Relações:** 1");
    expect(md).toContain("### Organizações (1)");
    expect(md).toContain("- **Vouga Agency** — *Ativa* [active]");
    expect(md).toContain("### Tarefas (1)");
    expect(md).toContain("- **Redesign Vouga** — *Em curso* [in_progress]");
    expect(md).toContain("- `comp-1` → `task-1` (assigned_to)");
  });
});
