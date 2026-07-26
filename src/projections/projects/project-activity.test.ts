import { describe, expect, it } from "vitest";

import type { ProjectDetail } from "./project-read-model";
import { composeProjectActivity } from "./project-activity";
import { projectFinancialSummary } from "./project-finance";

const project = {
  id: "project-1",
  name: "NovaSupplier MVP",
  status: "in_progress",
  client: { id: "company-1", name: "NovaSupplier" },
  owner: { id: "member-1", displayName: "Miguel" },
  startsOn: "2026-07-01",
  targetDeliveryOn: "2026-09-30",
  agreedAmountMinor: 400_000,
  receivedAmountMinor: 200_000,
  currency: "EUR",
  nextTask: null,
  objective: "Construir o MVP.",
  expectedResult: "Validar o fluxo.",
  team: [],
  contacts: [],
  tasks: [
    {
      id: "task-1",
      title: "Validar fluxo",
      status: "completed",
      ownerDisplayName: "Miguel",
      dueAt: "2026-07-20T09:00:00Z",
      completedAt: "2026-07-20T10:00:00Z",
    },
  ],
  meetings: [
    {
      id: "meeting-1",
      title: "Kickoff",
      kind: "meeting",
      status: "closed",
      startsAt: "2026-07-10T09:00:00Z",
      endsAt: "2026-07-10T10:00:00Z",
    },
  ],
  decisions: [],
  costs: [],
  scopeItems: [],
  milestones: [
    {
      id: "milestone-1",
      title: "Estrutura validada",
      position: 0,
      completedAt: "2026-07-18T12:00:00Z",
    },
  ],
  resources: [],
  statusChanges: [],
  createdAt: "2026-07-01T09:00:00Z",
  updatedAt: "2026-07-20T10:00:00Z",
} satisfies ProjectDetail;

describe("Project projections", () => {
  it("compõe atividade apenas a partir de fontes oficiais", () => {
    const activity = composeProjectActivity(project, "2026-07-25T12:00:00Z");

    expect(activity.map((item) => item.title)).toEqual([
      "Validar fluxo",
      "Estrutura validada",
      "Kickoff",
      "Project criado",
    ]);
  });

  it("deriva por receber sem persistir outro valor", () => {
    const finance = projectFinancialSummary(project);

    expect(finance.receivableAmountMinor).toBe(200_000);
    expect(finance.externalCosts).toEqual([]);
  });
});
