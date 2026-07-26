import type { CompanyReadModel } from "@/projections/companies/company-read-model";
import type { DecisionReadModel } from "@/projections/decisions/decision-read-model";
import type { MeetingReadModel } from "@/projections/meetings/meeting-read-model";
import type { ProjectReadModel } from "@/projections/projects/project-read-model";
import type { RoadmapReadModel } from "@/projections/roadmap/roadmap-read-model";
import type { SprintReadModel } from "@/projections/sprints/sprint-read-model";
import type { TaskReadModel } from "@/projections/tasks/task-read-model";
import type { RelationsReadModel } from "@/projections/relations/relations-read-model";

export type SearchObjectType =
  "company" | "contact" | "decision" | "meeting" | "project" | "roadmap" | "sprint" | "task";

export type GlobalSearchItem = Readonly<{
  description: string;
  href: string;
  id: string;
  keywords: readonly string[];
  title: string;
  type: SearchObjectType;
}>;

export type GlobalSearchProjection = Readonly<{
  items: readonly GlobalSearchItem[];
  isPartial: boolean;
}>;

type SearchSources = {
  companies: CompanyReadModel;
  decisions: DecisionReadModel;
  meetings: MeetingReadModel;
  projects: ProjectReadModel;
  roadmap: RoadmapReadModel;
  sprints: SprintReadModel;
  tasks: TaskReadModel;
  relations: RelationsReadModel;
};

export async function composeGlobalSearch(
  sources: SearchSources,
  now: string,
): Promise<GlobalSearchProjection> {
  const results = await Promise.allSettled([
    sources.companies.list(),
    sources.relations.listContacts(),
    sources.meetings.list(now),
    sources.projects.list(),
    sources.tasks.list(),
    sources.decisions.list(),
    sources.sprints.list(),
    sources.roadmap.getGlobal(),
    sources.roadmap.listHistory(),
  ] as const);
  const companies = settledValue(results[0], []);
  const contacts = settledValue(results[1], []);
  const meetings = settledValue(results[2], []);
  const projects = settledValue(results[3], []);
  const tasks = settledValue(results[4], []);
  const decisions = settledValue(results[5], []);
  const sprints = settledValue(results[6], []);
  const roadmap = settledValue(results[7], { now: [], next: [], later: [] });
  const roadmapHistory = settledValue(results[8], []);

  const items: GlobalSearchItem[] = [
    ...contacts.map((item) => ({
      description: `${item.companyName ?? "Independente"} · ${item.ownerDisplayName}`,
      href: `/relations/contacts/${item.id}`,
      id: item.id,
      keywords: [
        item.displayName,
        item.companyName ?? "",
        item.jobTitle ?? "",
        item.email ?? "",
        item.linkedinUrl ?? "",
      ],
      title: item.displayName,
      type: "contact" as const,
    })),
    ...companies.map((item) => ({
      description: `${item.ownerDisplayName} · ${item.status}`,
      href: `/companies/${item.id}`,
      id: item.id,
      keywords: [item.name, item.ownerDisplayName, item.currentContext ?? ""],
      title: item.name,
      type: "company" as const,
    })),
    ...meetings.map((item) => ({
      description: `${item.status} · ${formatDate(item.startsAt)}`,
      href: `/meetings/${item.id}`,
      id: item.id,
      keywords: [item.title, item.purpose ?? "", ...item.companyNames],
      title: item.title,
      type: "meeting" as const,
    })),
    ...projects.map((item) => ({
      description: `${item.client.name} · ${item.owner.displayName}`,
      href: `/projects/${item.id}`,
      id: item.id,
      keywords: [item.name, item.client.name, item.owner.displayName, item.nextTask?.title ?? ""],
      title: item.name,
      type: "project" as const,
    })),
    ...tasks.map((item) => ({
      description: `${item.status} · ${item.ownerDisplayName}`,
      href: `/tasks/${item.id}`,
      id: item.id,
      keywords: [
        item.title,
        item.expectedResult ?? "",
        item.ownerDisplayName,
        ...item.companyNames,
      ],
      title: item.title,
      type: "task" as const,
    })),
    ...decisions.map((item) => ({
      description: `${item.status} · ${item.authorityDisplayName}`,
      href: `/decisions/${item.id}`,
      id: item.id,
      keywords: [item.title, item.choice, item.authorityDisplayName],
      title: item.title,
      type: "decision" as const,
    })),
    ...sprints.map((item) => ({
      description: `${item.status} · ${formatDate(item.startsOn)}`,
      href: `/sprints/${item.id}`,
      id: item.id,
      keywords: [item.name, item.intendedResult, item.ownerDisplayName],
      title: item.name,
      type: "sprint" as const,
    })),
    ...[...roadmap.now, ...roadmap.next, ...roadmap.later, ...roadmapHistory].map((item) => ({
      description: `${item.horizon} · ${item.lifecycleStatus}`,
      href: `/roadmap/${item.id}`,
      id: item.id,
      keywords: [item.title, item.description, item.evidence, item.ownerDisplayName ?? ""],
      title: item.title,
      type: "roadmap" as const,
    })),
  ];

  return {
    items,
    isPartial: results.some((result) => result.status === "rejected"),
  };
}

function settledValue<T>(result: PromiseSettledResult<T>, fallback: T): T {
  return result.status === "fulfilled" ? result.value : fallback;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-PT", {
    dateStyle: "medium",
    timeZone: "Europe/Lisbon",
  }).format(new Date(value));
}
