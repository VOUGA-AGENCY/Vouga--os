import { describe, expect, it } from "vitest";

import {
  availableProjectTransitions,
  ProjectTransitionError,
  ProjectValidationError,
  transitionProject,
  type Project,
  validateProjectValues,
} from "./project";

const values = {
  name: "NovaSupplier MVP",
  clientCompanyId: "company-1",
  ownerMemberId: "member-1",
  startsOn: "2026-07-24",
  targetDeliveryOn: "2026-09-30",
  agreedAmountMinor: 400_000,
  receivedAmountMinor: 200_000,
  currency: "eur",
  objective: "Construir um MVP funcional para validar o fluxo.",
  expectedResult: "O utilizador consegue criar e acompanhar uma prospeção.",
  taskIds: ["task-1"],
  nextTaskId: "task-1",
  teamMemberIds: ["member-2", "member-1"],
};

const { outOfScopeItems, scopeItems, milestones, resources, ...validProject } =
  validateProjectValues(values);

const project: Project = {
  id: "project-1",
  ...validProject,
  status: "in_progress",
  scopeItems: [
    ...scopeItems.map((item, position) => ({
      id: item.id ?? `scope-${position}`,
      kind: "in_scope" as const,
      label: item.title,
      position,
    })),
    ...outOfScopeItems.map((item, position) => ({
      id: item.id ?? `out-${position}`,
      kind: "out_of_scope" as const,
      label: item.title,
      position,
    })),
  ],
  milestones: milestones.map((item, position) => ({
    id: item.id ?? `milestone-${position}`,
    title: item.title,
    completedAt: item.completedAt,
    position,
  })),
  resources: resources.map((item, position) => ({
    id: item.id ?? `resource-${position}`,
    title: item.title,
    kind: item.kind,
    url: item.url,
    position,
  })),
  createdAt: "2026-07-24T09:00:00.000Z",
  updatedAt: "2026-07-24T09:00:00.000Z",
};

describe("Project", () => {
  it("normaliza o modelo mínimo e inclui o owner na equipa", () => {
    const result = validateProjectValues(values);

    expect(result.currency).toBe("EUR");
    expect(result.teamMemberIds).toEqual(["member-1", "member-2"]);
    expect(result.nextTaskId).toBe("task-1");
  });

  it("rejeita uma entrega anterior ao início", () => {
    expect(() => validateProjectValues({ ...values, targetDeliveryOn: "2026-07-20" })).toThrow(
      ProjectValidationError,
    );
  });

  it("rejeita recebido acima do acordado", () => {
    expect(() => validateProjectValues({ ...values, receivedAmountMinor: 500_000 })).toThrow(
      "valor recebido",
    );
  });

  it("exige que a próxima ação seja uma Task do Project", () => {
    expect(() => validateProjectValues({ ...values, nextTaskId: "task-2" })).toThrow(
      "Task associada",
    );
  });

  it("permite esperar pelo cliente e retomar o trabalho", () => {
    const waiting = transitionProject(project, "waiting_client", "2026-07-25T09:00:00Z");
    const resumed = transitionProject(waiting, "in_progress", "2026-07-26T09:00:00Z");

    expect(waiting.status).toBe("waiting_client");
    expect(resumed.status).toBe("in_progress");
  });

  it("mantém Encerrado como terminal", () => {
    const closed = { ...project, status: "closed" as const };

    expect(availableProjectTransitions("closed")).toEqual([]);
    expect(() => transitionProject(closed, "in_progress", "2026-07-26T09:00:00Z")).toThrow(
      ProjectTransitionError,
    );
  });
});
