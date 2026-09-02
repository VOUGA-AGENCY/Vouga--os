import type { CompanyReadModel } from "@/projections/companies/company-read-model";
import type { ProjectReadModel } from "@/projections/projects/project-read-model";
import type { RelationsReadModel } from "@/projections/relations/relations-read-model";
import type { TaskReadModel } from "@/projections/tasks/task-read-model";

export type GlobalContextSnapshot = Readonly<{
  companies: Awaited<ReturnType<CompanyReadModel["list"]>>;
  contacts: Awaited<ReturnType<RelationsReadModel["listContacts"]>>;
  projects: Awaited<ReturnType<ProjectReadModel["list"]>>;
  interactions: Awaited<ReturnType<RelationsReadModel["listRecentInteractions"]>>;
  tasks: Awaited<ReturnType<TaskReadModel["list"]>>;
}>;

const INTERACTION_WINDOW_DAYS = 90;
const INTERACTION_LIMIT = 100;
const SYNTHETIC_ID_PREFIXES = ["f004", "f006", "f007", "f011"];

export class GlobalContextProjection {
  constructor(
    private readonly companies: CompanyReadModel,
    private readonly relations: RelationsReadModel,
    private readonly projects: ProjectReadModel,
    private readonly tasks: TaskReadModel,
  ) {}

  async get(nowIso: string): Promise<GlobalContextSnapshot> {
    const now = new Date(nowIso);
    const since = new Date(now.getTime() - INTERACTION_WINDOW_DAYS * 86_400_000).toISOString();
    const [companies, contacts, projects, interactions, tasks] = await Promise.all([
      this.companies.list(),
      this.relations.listContacts(),
      this.projects.list(),
      this.relations.listRecentInteractions(since, INTERACTION_LIMIT),
      this.tasks.list(),
    ]);
    const relevantCompanyIds = new Set(
      companies
        .filter((item) => item.status === "active" && !isSynthetic(item.id))
        .map((item) => item.id),
    );

    return {
      companies: companies.filter((item) => relevantCompanyIds.has(item.id)),
      contacts: contacts.filter(
        (item) =>
          item.status === "active" &&
          !isSynthetic(item.id) &&
          (!item.companyId || relevantCompanyIds.has(item.companyId)),
      ),
      projects: projects.filter(
        (item) =>
          item.status !== "closed" &&
          relevantCompanyIds.has(item.client.id) &&
          !isSynthetic(item.id),
      ),
      interactions: interactions.filter(
        (item) => relevantCompanyIds.has(item.companyId) && !isSynthetic(item.id),
      ),
      tasks: tasks.filter(
        (item) => ["todo", "in_progress", "blocked"].includes(item.status) && !isSynthetic(item.id),
      ),
    };
  }
}

function isSynthetic(id: string): boolean {
  return SYNTHETIC_ID_PREFIXES.some((prefix) => id.toLowerCase().startsWith(prefix));
}
