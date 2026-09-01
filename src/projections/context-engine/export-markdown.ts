import type { FullContextGraph, GraphNode, ObjectContext } from "./context-engine";

export type ExportMarkdownOptions = {
  targetTitle?: string;
  generatedAt?: string;
};

/**
 * Serializa o contexto operacional factual num formato Markdown limpo,
 * ideal para exportação, auditoria ou integração em prompts LLM sem alucinações.
 */
export function exportContextToMarkdown(
  context: ObjectContext,
  options?: ExportMarkdownOptions,
): string {
  const generatedAt = options?.generatedAt ?? new Date().toISOString();
  const targetTitle =
    options?.targetTitle ??
    `${context.target.type.toUpperCase()}:${context.target.id}`;

  const lines: string[] = [
    `# Contexto Operacional: ${targetTitle}`,
    "",
    `> **Data de Geração:** ${generatedAt}`,
    `> **Origem:** Vouga OS Context Engine`,
    `> **Integridade:** ${
      context.isPartial
        ? "Parcial (algumas fontes indisponíveis)"
        : "Completo"
    }`,
    "",
  ];

  for (const section of context.sections) {
    lines.push(`## ${section.title}`);
    lines.push(`*Fonte oficial: ${section.source}*`);
    lines.push("");

    if (section.status === "ready") {
      if (section.items.length === 0) {
        lines.push("- *Sem registos associados.*");
      } else {
        for (const item of section.items) {
          const metaStr = item.meta ? ` — *${item.meta}*` : "";
          const linkStr = item.href ? ` [${item.href}]` : "";
          lines.push(`- **${item.label}**${metaStr}${linkStr}`);
        }
      }
    } else if (section.status === "empty") {
      lines.push(`- *${section.message || "Sem informação."}*`);
    } else if (section.status === "error") {
      lines.push(
        `> ⚠️ **Aviso de Fonte:** ${section.message || "Fonte indisponível."}`,
      );
    }

    lines.push("");
  }

  return lines.join("\n").trimEnd() + "\n";
}

/**
 * Serializa o grafo operacional global num resumo estruturado em Markdown factual.
 */
export function exportGraphToMarkdown(
  graph: FullContextGraph,
  options?: { generatedAt?: string },
): string {
  const generatedAt = options?.generatedAt ?? new Date().toISOString();
  const lines: string[] = [
    "# Contexto Operacional Global — Vouga OS",
    "",
    `> **Data de Geração:** ${generatedAt}`,
    `> **Origem:** Vouga OS Context Engine (Grafo Completo)`,
    `> **Entidades:** ${graph.stats.totalEntities} | **Relações:** ${graph.stats.totalConnections}`,
    "",
    "## Resumo das Entidades",
    "",
  ];

  const byType = new Map<string, GraphNode[]>();
  for (const node of graph.nodes) {
    const list = byType.get(node.type) ?? [];
    list.push(node);
    byType.set(node.type, list);
  }

  const typeLabels: Record<string, string> = {
    company: "Organizações",
    contact: "Contactos / Perfis",
    task: "Tarefas",
    meeting: "Meetings",
    decision: "Decisões",
    cost: "Custos",
    sprint: "Sprints",
    roadmap: "Roadmap",
  };

  for (const [type, nodes] of byType.entries()) {
    const label = typeLabels[type] ?? type.toUpperCase();
    lines.push(`### ${label} (${nodes.length})`);
    for (const node of nodes) {
      const sub = node.sublabel ? ` — *${node.sublabel}*` : "";
      const status = node.status ? ` [${node.status}]` : "";
      lines.push(`- **${node.label}**${sub}${status}`);
    }
    lines.push("");
  }

  if (graph.edges.length > 0) {
    lines.push("## Ligações e Relações Operacionais");
    lines.push("");
    for (const edge of graph.edges) {
      lines.push(`- \`${edge.source}\` → \`${edge.target}\` (${edge.relation})`);
    }
    lines.push("");
  }

  return lines.join("\n").trimEnd() + "\n";
}
