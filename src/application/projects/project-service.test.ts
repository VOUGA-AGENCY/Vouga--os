import { describe, expect, it } from "vitest";

import type { MemberDirectory } from "@/application/members/contracts";
import {
  ProjectTransitionError,
  type Project,
  type ValidProjectValues,
} from "@/domain/projects/project";

import type { ProjectContextDirectory, ProjectRepository } from "./contracts";
import { ProjectReferenceError, ProjectService } from "./project-service";

const input = {
  name: "NovaSupplier MVP",
  clientCompanyId: "company-1",
  ownerMemberId: "member-1",
  startsOn: "2026-07-24",
  targetDeliveryOn: "2026-09-30",
  agreedAmountMinor: 400_000,
  receivedAmountMinor: 200_000,
  currency: "EUR",
  objective: "Construir um MVP funcional.",
  expectedResult: "O utilizador acompanha a prospeção.",
  teamMemberIds: ["member-1"],
};

class MemoryProjects implements ProjectRepository {
  value: Project | null = null;

  async findById() {
    return this.value;
  }

  async create(values: ValidProjectValues) {
    this.value = project(values);
    return this.value;
  }

  async update(_project: Project, values: ValidProjectValues) {
    this.value = project(values);
    return this.value;
  }

  async transition(current: Project, status: Project["status"]) {
    this.value = { ...current, status };
    return this.value;
  }
}

const members: MemberDirectory = {
  listActive: async () => [{ id: "member-1", displayName: "Miguel", email: "miguel@vouga.pt" }],
  isActive: async (id) => id === "member-1",
};

const contexts: ProjectContextDirectory = {
  getOptions: async () => ({
    companies: [],
    contacts: [],
    tasks: [],
    meetings: [],
    decisions: [],
    costs: [],
  }),
  referencesExist: async () => true,
};

describe("ProjectService", () => {
  it("cria um Project validado", async () => {
    const repository = new MemoryProjects();
    const service = new ProjectService(repository, members, contexts);

    const created = await service.createProject(input);

    expect(created.name).toBe("NovaSupplier MVP");
    expect(created.status).toBe("not_started");
  });

  it("rejeita Members inativos", async () => {
    const service = new ProjectService(new MemoryProjects(), members, contexts);

    await expect(
      service.createProject({ ...input, teamMemberIds: ["member-2"] }),
    ).rejects.toBeInstanceOf(ProjectReferenceError);
  });

  it("rejeita referências inexistentes", async () => {
    const service = new ProjectService(new MemoryProjects(), members, {
      ...contexts,
      referencesExist: async () => false,
    });

    await expect(service.createProject(input)).rejects.toBeInstanceOf(ProjectReferenceError);
  });

  it("preserva o ciclo de vida no domínio antes do repository", async () => {
    const repository = new MemoryProjects();
    repository.value = projectFromInput("not_started");
    const service = new ProjectService(repository, members, contexts);

    await expect(
      service.transitionProject("project-1", "delivered", "2026-07-25T10:00:00Z"),
    ).rejects.toBeInstanceOf(ProjectTransitionError);
  });
});

function project(values: ValidProjectValues): Project {
  return {
    id: "project-1",
    name: values.name,
    clientCompanyId: values.clientCompanyId,
    ownerMemberId: values.ownerMemberId,
    status: "not_started",
    startsOn: values.startsOn,
    targetDeliveryOn: values.targetDeliveryOn,
    agreedAmountMinor: values.agreedAmountMinor,
    receivedAmountMinor: values.receivedAmountMinor,
    currency: values.currency,
    objective: values.objective,
    expectedResult: values.expectedResult,
    nextTaskId: values.nextTaskId,
    teamMemberIds: values.teamMemberIds,
    contactIds: values.contactIds,
    taskIds: values.taskIds,
    meetingIds: values.meetingIds,
    decisionIds: values.decisionIds,
    costIds: values.costIds,
    scopeItems: [],
    milestones: [],
    resources: [],
    createdAt: "2026-07-24T09:00:00.000Z",
    updatedAt: "2026-07-24T09:00:00.000Z",
  };
}

function projectFromInput(status: Project["status"]) {
  return {
    ...project({
      ...input,
      nextTaskId: null,
      contactIds: [],
      taskIds: [],
      meetingIds: [],
      decisionIds: [],
      costIds: [],
      scopeItems: [],
      outOfScopeItems: [],
      milestones: [],
      resources: [],
    }),
    status,
  };
}
