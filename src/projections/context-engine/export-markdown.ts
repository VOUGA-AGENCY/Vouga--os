import type { FullContextGraph, GraphNode, ObjectContext } from "./context-engine";
import { COMPANY_STATUS_LABELS, PROSPECTING_STAGE_LABELS } from "@/domain/companies/company";
import { PROJECT_STATUS_LABELS } from "@/domain/projects/project";
import { CONTACT_CHANNEL_LABELS, CONTACT_ROLE_LABELS } from "@/domain/relations/contact";
import { TASK_STATUS_LABELS } from "@/domain/tasks/task";
import type { GlobalContextSnapshot } from "./global-context";

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
    options?.targetTitle ?? `${context.target.type.toUpperCase()}:${context.target.id}`;

  const lines: string[] = [
    `# Contexto Operacional: ${targetTitle}`,
    "",
    `> **Data de Geração:** ${generatedAt}`,
    `> **Origem:** Vouga OS Context Engine`,
    `> **Integridade:** ${
      context.isPartial ? "Parcial (algumas fontes indisponíveis)" : "Completo"
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
      lines.push(`> ⚠️ **Aviso de Fonte:** ${section.message || "Fonte indisponível."}`);
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

const VOUGA_CONTEXT = [
  "A Vouga Agency é uma consultora tecnológica portuguesa focada inicialmente na indústria transformadora. Ajudamos empresas industriais a digitalizar as suas operações e a construir as fundações necessárias para uma evolução AI-native.",
  "A nossa abordagem é system-first: procuramos primeiro compreender como a empresa opera e só depois identificar onde software, automação e inteligência artificial conseguem criar valor.",
  "A atuação da Vouga organiza-se em três áreas: Visibility, Operations e Intelligence.",
  "O foco comercial inicial está sobretudo em PMEs industriais portuguesas, com prioridade ao Norte e à região de Entre Douro e Vouga. A estratégia atual é services-first: executar projetos, gerar receita e aprender com problemas reais do mercado, usando esse conhecimento para desenvolver progressivamente a metodologia, os sistemas e as oportunidades futuras da Vouga.",
];

/** Export factual e determinístico para consumo humano ou por uma LLM. */
export function exportGlobalContextToMarkdown(snapshot: GlobalContextSnapshot): string {
  const lines = ["# VOUGA — GLOBAL CONTEXT", "", "## Sobre a Vouga", ""];
  for (const paragraph of VOUGA_CONTEXT) lines.push(paragraph, "");

  section(lines, "Organizações", snapshot.companies, (company) => {
    const values = [
      field(
        "Estado",
        company.prospectingStage
          ? PROSPECTING_STAGE_LABELS[company.prospectingStage]
          : COMPANY_STATUS_LABELS[company.status],
      ),
      field("CAE", company.primaryCae),
      field("Website", company.website),
      field("Telefone", company.contactPhone),
      field("Email", company.contactEmail),
      field("Owner", company.ownerDisplayName),
      field("Notas", company.currentContext),
      field("Riscos da relação", company.relationshipRisks),
    ];
    return entity(company.name, values);
  });

  section(lines, "Perfis", snapshot.contacts, (contact) =>
    entity(contact.displayName, [
      field("Cargo", contact.jobTitle),
      field("Relação", CONTACT_ROLE_LABELS[contact.relationshipRole]),
      field("Organização", contact.companyName),
      field("Owner", contact.ownerDisplayName),
      field("Email", contact.email),
      field("Telefone", contact.phone),
      field("LinkedIn", contact.linkedinUrl),
      field("Notas", contact.importantContext),
    ]),
  );

  section(lines, "Projetos", snapshot.projects, (project) =>
    entity(project.name, [
      field("Organização", project.client.name),
      field("Estado", PROJECT_STATUS_LABELS[project.status]),
      field("Owner", project.owner.displayName),
      field("Objetivo", project.objective),
      field("Resultado esperado", project.expectedResult),
      field("Data de início", formatDate(project.startsOn)),
      field("Entrega prevista", formatDate(project.targetDeliveryOn)),
      field("Próxima ação", project.nextTask?.title),
    ]),
  );

  section(
    lines,
    "Interações recentes",
    snapshot.interactions,
    (interaction) =>
      entity(`${formatDateTime(interaction.occurredAt)} — ${interaction.companyName}`, [
        field("Tipo", CONTACT_CHANNEL_LABELS[interaction.channel]),
        field("Perfil", interaction.contactName),
        field("Responsável", interaction.recorderName),
        field("Direção", interaction.direction === "inbound" ? "Recebida" : "Enviada"),
        field("Notas", interaction.body),
      ]),
    (left, right) => right.occurredAt.localeCompare(left.occurredAt),
  );

  lines.push("## Tarefas ativas", "");
  if (snapshot.tasks.length === 0) {
    lines.push("_Nenhum registo relevante._", "");
  } else {
    for (const task of [...snapshot.tasks].sort(compareBy((item) => item.dueAt ?? "9999"))) {
      const details = [
        `responsável: ${task.ownerDisplayName}`,
        `estado: ${TASK_STATUS_LABELS[task.status]}`,
        task.dueAt ? `deadline: ${formatDate(task.dueAt)}` : null,
        task.companyNames.length ? `organização: ${task.companyNames.join(", ")}` : null,
      ].filter(Boolean);
      lines.push(`- ${task.title} — ${details.join(" — ")}`);
    }
    lines.push("");
  }

  return lines.join("\n").trimEnd() + "\n";
}

function section<T>(
  lines: string[],
  title: string,
  values: readonly T[],
  render: (value: T) => string[],
  compare: (left: T, right: T) => number = compareBy((item) => labelFor(item)),
) {
  lines.push(`## ${title}`, "");
  if (values.length === 0) lines.push("_Nenhum registo relevante._", "");
  else for (const value of [...values].sort(compare)) lines.push(...render(value));
}

function entity(title: string, values: Array<string | null>): string[] {
  return [`### ${title}`, "", ...values.filter((value): value is string => Boolean(value)), ""];
}

function field(label: string, value: string | null | undefined): string | null {
  const clean = value?.trim();
  return clean ? `- ${label}: ${clean}` : null;
}

function labelFor(value: unknown): string {
  if (!value || typeof value !== "object") return "";
  const row = value as Record<string, unknown>;
  return String(row.name ?? row.displayName ?? row.occurredAt ?? "");
}

function compareBy<T>(pick: (value: T) => string) {
  return (left: T, right: T) =>
    pick(left).localeCompare(pick(right), "pt-PT", { sensitivity: "base" });
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("pt-PT", { dateStyle: "long", timeZone: "Europe/Lisbon" }).format(
    new Date(value),
  );
}

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat("pt-PT", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/Lisbon",
  }).format(new Date(value));
}
