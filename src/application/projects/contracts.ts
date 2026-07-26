import type { ActiveMember } from "@/application/members/contracts";
import type { Project, ProjectStatus, ValidProjectValues } from "@/domain/projects/project";

export type ProjectContextOption = Readonly<{
  id: string;
  label: string;
  meta?: string;
  companyId?: string | null;
  kind?: string;
  status?: string;
}>;

export type ProjectFormOptions = Readonly<{
  members: readonly ActiveMember[];
  companies: readonly ProjectContextOption[];
  contacts: readonly ProjectContextOption[];
  tasks: readonly ProjectContextOption[];
  meetings: readonly ProjectContextOption[];
  decisions: readonly ProjectContextOption[];
  costs: readonly ProjectContextOption[];
}>;

export interface ProjectContextDirectory {
  getOptions(): Promise<Omit<ProjectFormOptions, "members">>;
  referencesExist(values: ValidProjectValues): Promise<boolean>;
}

export interface ProjectRepository {
  findById(id: string): Promise<Project | null>;
  create(values: ValidProjectValues): Promise<Project>;
  update(project: Project, values: ValidProjectValues): Promise<Project>;
  transition(project: Project, status: ProjectStatus): Promise<Project>;
}
