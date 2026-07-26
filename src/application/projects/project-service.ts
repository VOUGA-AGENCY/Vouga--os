import type { MemberDirectory } from "@/application/members/contracts";
import {
  assertProjectEditable,
  PROJECT_STATUSES,
  ProjectTransitionError,
  ProjectValidationError,
  transitionProject,
  type ProjectStatus,
  type ProjectValues,
  validateProjectValues,
} from "@/domain/projects/project";

import type { ProjectContextDirectory, ProjectFormOptions, ProjectRepository } from "./contracts";

export class ProjectNotFoundError extends Error {
  constructor() {
    super("O Project não existe.");
    this.name = "ProjectNotFoundError";
  }
}

export class ProjectReferenceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProjectReferenceError";
  }
}

export type ProjectFormState = { message: string | null };

export class ProjectService {
  constructor(
    private readonly projects: ProjectRepository,
    private readonly members: MemberDirectory,
    private readonly contexts: ProjectContextDirectory,
  ) {}

  async getFormOptions(): Promise<ProjectFormOptions> {
    const [members, contexts] = await Promise.all([
      this.members.listActive(),
      this.contexts.getOptions(),
    ]);
    return { members, ...contexts };
  }

  async getProject(id: string) {
    const project = await this.projects.findById(id);
    if (!project) throw new ProjectNotFoundError();
    return project;
  }

  async createProject(values: ProjectValues) {
    const valid = validateProjectValues(values);
    await this.assertReferences(valid);
    return this.projects.create(valid);
  }

  async updateProject(id: string, values: ProjectValues) {
    const project = await this.getProject(id);
    assertProjectEditable(project);
    const valid = validateProjectValues(values);
    await this.assertReferences(valid);
    return this.projects.update(project, valid);
  }

  async transitionProject(id: string, status: ProjectStatus, changedAt: string) {
    if (!PROJECT_STATUSES.includes(status)) {
      throw new ProjectTransitionError("O estado do Project não é válido.");
    }
    const project = await this.getProject(id);
    transitionProject(project, status, changedAt);
    return this.projects.transition(project, status);
  }

  private async assertReferences(values: ReturnType<typeof validateProjectValues>) {
    const members = [...new Set([values.ownerMemberId, ...values.teamMemberIds])];
    const memberChecks = await Promise.all(members.map((id) => this.members.isActive(id)));
    if (memberChecks.some((active) => !active)) {
      throw new ProjectReferenceError("Seleciona apenas Members ativos.");
    }
    if (!(await this.contexts.referencesExist(values))) {
      throw new ProjectReferenceError(
        "Uma das relações selecionadas já não existe ou não pertence ao cliente.",
      );
    }
  }
}

export function getProjectApplicationErrorMessage(error: unknown) {
  if (
    error instanceof ProjectValidationError ||
    error instanceof ProjectTransitionError ||
    error instanceof ProjectNotFoundError ||
    error instanceof ProjectReferenceError
  ) {
    return error.message;
  }
  return "Não foi possível guardar o Project. Tenta novamente.";
}
