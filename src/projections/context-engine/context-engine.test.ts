import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it, vi } from "vitest";

import type { CompanyReadModel } from "@/projections/companies/company-read-model";
import type { CostReadModel } from "@/projections/costs/cost-read-model";
import { ContextEngine } from "@/projections/context-engine/context-engine";
import type { DecisionReadModel } from "@/projections/decisions/decision-read-model";
import type { MeetingReadModel } from "@/projections/meetings/meeting-read-model";
import type { RoadmapReadModel } from "@/projections/roadmap/roadmap-read-model";
import type { SprintReadModel } from "@/projections/sprints/sprint-read-model";
import type { TaskDetail, TaskListItem, TaskReadModel } from "@/projections/tasks/task-read-model";
import type { RelationsReadModel } from "@/projections/relations/relations-read-model";

const NOW = "2026-07-16T12:00:00.000Z";

describe("ContextEngine", () => {
  it("composes Company context with multiple official relations", async () => {
    const engine = createEngine({
      tasks: {
        listByCompany: vi
          .fn()
          .mockResolvedValue([
            task({ id: "task-1", title: "Preparar proposta" }),
            task({ id: "task-2", title: "Validar contrato", status: "blocked" }),
          ]),
      },
      meetings: {
        listByCompany: vi.fn().mockResolvedValue([meeting({ id: "meeting-1", title: "Kick-off" })]),
      },
      decisions: {
        listByCompany: vi
          .fn()
          .mockResolvedValue([decision({ id: "decision-1", title: "Avançar com piloto" })]),
      },
      sprints: {
        listByTaskIds: vi
          .fn()
          .mockResolvedValue([sprint({ id: "sprint-1", name: "Sprint piloto" })]),
      },
      roadmap: {
        listByCompany: vi
          .fn()
          .mockResolvedValue([roadmapSummary({ id: "roadmap-1", title: "Validar serviço" })]),
      },
    });

    const context = await engine.get({ type: "company", id: "company-1" }, NOW);

    expect(section(context, "company-tasks").items).toHaveLength(2);
    expect(section(context, "company-meetings").items[0]?.label).toBe("Kick-off");
    expect(section(context, "company-decisions").items[0]?.label).toBe("Avançar com piloto");
    expect(section(context, "company-sprints").items[0]?.label).toBe("Sprint piloto");
    expect(section(context, "company-roadmap").items[0]?.label).toBe("Validar serviço");
    expect(context.isPartial).toBe(false);
  });

  it("keeps empty Company context explicit", async () => {
    const context = await createEngine().get({ type: "company", id: "company-empty" }, NOW);

    expect(context.sections.every((entry) => entry.status === "empty")).toBe(true);
    expect(section(context, "company-tasks").message).toBe("Sem Tasks relacionadas.");
  });

  it("shows Task origin and every explicit relation without reading free text", async () => {
    const source = taskDetail({
      origin: {
        type: "meeting",
        meetingId: "meeting-origin",
        decisionId: null,
        directReason: null,
      },
      originLabel: "Meeting · Kick-off",
      originMeetingId: "meeting-origin",
      companyIds: ["company-1"],
      companyNames: ["Acme"],
      meetingIds: ["meeting-origin"],
      meetingTitles: ["Kick-off"],
    });
    const engine = createEngine({
      tasks: { findById: vi.fn().mockResolvedValue(source) },
      decisions: {
        listByTask: vi
          .fn()
          .mockResolvedValue([decision({ id: "decision-1", title: "Escolha associada" })]),
      },
      sprints: {
        listByTaskIds: vi
          .fn()
          .mockResolvedValue([sprint({ id: "sprint-1", name: "Sprint atual" })]),
      },
      roadmap: {
        listByTask: vi
          .fn()
          .mockResolvedValue([roadmapSummary({ id: "roadmap-1", title: "Resultado relacionado" })]),
      },
    });

    const context = await engine.get({ type: "task", id: source.id }, NOW);

    expect(section(context, "task-origin").items[0]?.href).toBe("/meetings/meeting-origin");
    expect(section(context, "task-companies").items[0]?.label).toBe("Acme");
    expect(section(context, "task-decisions").items[0]?.id).toBe("decision-1");
    expect(section(context, "task-sprints").items[0]?.id).toBe("sprint-1");
    expect(section(context, "task-roadmap").items[0]?.id).toBe("roadmap-1");
  });

  it("does not infer Task context from a direct-origin explanation", async () => {
    const source = taskDetail({
      origin: {
        type: "direct",
        meetingId: null,
        decisionId: null,
        directReason: "Falar com a Company Acme depois da Meeting semanal",
      },
      originLabel: "Captura direta",
    });
    const engine = createEngine({
      tasks: { findById: vi.fn().mockResolvedValue(source) },
    });

    const context = await engine.get({ type: "task", id: source.id }, NOW);

    expect(section(context, "task-origin").items[0]?.meta).toContain("Acme");
    expect(section(context, "task-companies").status).toBe("empty");
    expect(section(context, "task-meetings").status).toBe("empty");
  });

  it("distinguishes Meeting consequences from merely related objects", async () => {
    const engine = createEngine({
      meetings: {
        findById: vi
          .fn()
          .mockResolvedValue(meetingDetail({ companyIds: ["company-1"], companyNames: ["Acme"] })),
      },
      tasks: {
        listByMeeting: vi.fn().mockResolvedValue([
          task({
            id: "task-origin",
            title: "Enviar proposta",
            originMeetingId: "meeting-1",
          }),
          task({ id: "task-related", title: "Rever pricing" }),
        ]),
      },
      decisions: {
        listByMeeting: vi.fn().mockResolvedValue([
          decision({
            id: "decision-origin",
            title: "Aprovar piloto",
            originMeetingId: "meeting-1",
          }),
        ]),
      },
    });

    const context = await engine.get({ type: "meeting", id: "meeting-1" }, NOW);

    expect(section(context, "meeting-companies").items[0]?.label).toBe("Acme");
    expect(section(context, "meeting-tasks").items.map((entry) => entry.meta)).toEqual([
      "Originada nesta Meeting",
      "Por fazer",
    ]);
    expect(section(context, "meeting-decisions").items[0]?.meta).toBe("Tomada nesta Meeting");
  });

  it("represents direct and Meeting-origin Decisions honestly", async () => {
    const directEngine = createEngine({
      decisions: {
        findById: vi.fn().mockResolvedValue(decisionDetail()),
      },
    });
    const direct = await directEngine.get({ type: "decision", id: "decision-1" }, NOW);
    expect(section(direct, "decision-origin").status).toBe("empty");

    const meetingEngine = createEngine({
      decisions: {
        findById: vi.fn().mockResolvedValue(
          decisionDetail({
            originMeetingId: "meeting-1",
            originMeetingTitle: "Revisão semanal",
          }),
        ),
      },
    });
    const originated = await meetingEngine.get({ type: "decision", id: "decision-1" }, NOW);
    expect(section(originated, "decision-origin").items[0]?.href).toBe("/meetings/meeting-1");
  });

  it("composes Sprint commitment and cross-object context from committed Tasks", async () => {
    const engine = createEngine({
      sprints: {
        findById: vi.fn().mockResolvedValue(
          sprintDetail({
            tasks: [
              sprintTask({ taskId: "task-1", status: "in_progress" }),
              sprintTask({ taskId: "task-2", status: "blocked" }),
              sprintTask({ taskId: "task-3", status: "completed" }),
            ],
          }),
        ),
      },
      tasks: {
        findById: vi
          .fn()
          .mockResolvedValueOnce(
            taskDetail({
              id: "task-1",
              companyIds: ["company-1"],
              companyNames: ["Acme"],
            }),
          )
          .mockResolvedValueOnce(
            taskDetail({
              id: "task-2",
              meetingIds: ["meeting-1"],
              meetingTitles: ["Kick-off"],
            }),
          )
          .mockResolvedValueOnce(taskDetail({ id: "task-3" })),
      },
      decisions: {
        listByTask: vi
          .fn()
          .mockResolvedValueOnce([decision({ id: "decision-1" })])
          .mockResolvedValueOnce([])
          .mockResolvedValueOnce([]),
      },
      roadmap: {
        listBySprint: vi.fn().mockResolvedValue([roadmapSummary({ id: "roadmap-1" })]),
      },
    });

    const context = await engine.get({ type: "sprint", id: "sprint-1" }, NOW);

    expect(section(context, "sprint-tasks").items.map((entry) => entry.meta)).toEqual([
      "Em curso",
      "Bloqueada",
      "Concluída",
    ]);
    expect(section(context, "sprint-companies").items[0]?.label).toBe("Acme");
    expect(section(context, "sprint-meetings").items[0]?.label).toBe("Kick-off");
    expect(section(context, "sprint-decisions").items[0]?.id).toBe("decision-1");
    expect(section(context, "sprint-roadmap").items[0]?.id).toBe("roadmap-1");
  });

  it("shows Roadmap justification and execution through explicit links", async () => {
    const engine = createEngine({
      roadmap: {
        findById: vi.fn().mockResolvedValue(
          roadmapDetail({
            decisions: [{ id: "decision-1", label: "Aprovar direção" }],
            tasks: [{ id: "task-1", label: "Executar experiência", meta: "Em curso" }],
            companies: [{ id: "company-1", label: "Acme" }],
            sprints: [{ id: "sprint-1", label: "Sprint atual", meta: "Ativa" }],
          }),
        ),
      },
    });

    const context = await engine.get({ type: "roadmap-item", id: "roadmap-1" }, NOW);

    expect(section(context, "roadmap-decisions").items[0]?.label).toBe("Aprovar direção");
    expect(section(context, "roadmap-tasks").items[0]?.meta).toBe("Em curso");
    expect(section(context, "roadmap-sprints").items[0]?.label).toBe("Sprint atual");
  });

  it("exposes a partial state when one official source fails", async () => {
    const engine = createEngine({
      meetings: {
        listByCompany: vi.fn().mockRejectedValue(new Error("source unavailable")),
      },
      tasks: {
        listByCompany: vi.fn().mockResolvedValue([task()]),
      },
    });

    const context = await engine.get({ type: "company", id: "company-1" }, NOW);

    expect(context.isPartial).toBe(true);
    expect(section(context, "company-meetings").status).toBe("error");
    expect(section(context, "company-tasks").status).toBe("ready");
  });

  it("has no Context persistence, domain entity or migration", () => {
    const root = process.cwd();
    expect(existsSync(join(root, "src/domain/context"))).toBe(false);
    expect(existsSync(join(root, "src/persistence/context"))).toBe(false);
    expect(
      readdirSync(join(root, "supabase/migrations")).some((name) =>
        name.toLowerCase().includes("context"),
      ),
    ).toBe(false);
  });
});

function createEngine(
  overrides: Partial<{
    companies: Partial<CompanyReadModel>;
    costs: Partial<CostReadModel>;
    tasks: Partial<TaskReadModel>;
    meetings: Partial<MeetingReadModel>;
    decisions: Partial<DecisionReadModel>;
    sprints: Partial<SprintReadModel>;
    roadmap: Partial<RoadmapReadModel>;
    relations: Partial<RelationsReadModel>;
  }> = {},
) {
  return new ContextEngine({
    companies: {
      list: vi.fn().mockResolvedValue([]),
      findById: vi.fn().mockImplementation(async (id: string) => companyDetail({ id })),
      ...overrides.companies,
    } as CompanyReadModel,
    costs: {
      list: vi.fn().mockResolvedValue([]),
      findById: vi.fn().mockResolvedValue(null),
      listByCompany: vi.fn().mockResolvedValue([]),
      listByRoadmapItem: vi.fn().mockResolvedValue([]),
      listByDecision: vi.fn().mockResolvedValue([]),
      listByTask: vi.fn().mockResolvedValue([]),
      listByTaskIds: vi.fn().mockResolvedValue([]),
      listCashBalances: vi.fn().mockResolvedValue([]),
      ...overrides.costs,
    } as CostReadModel,
    tasks: {
      list: vi.fn().mockResolvedValue([]),
      listByCompany: vi.fn().mockResolvedValue([]),
      listByMeeting: vi.fn().mockResolvedValue([]),
      findById: vi.fn().mockResolvedValue(taskDetail()),
      ...overrides.tasks,
    } as TaskReadModel,
    meetings: {
      list: vi.fn().mockResolvedValue([]),
      listByCompany: vi.fn().mockResolvedValue([]),
      findById: vi.fn().mockResolvedValue(meetingDetail()),
      ...overrides.meetings,
    } as MeetingReadModel,
    decisions: {
      list: vi.fn().mockResolvedValue([]),
      listByCompany: vi.fn().mockResolvedValue([]),
      listByMeeting: vi.fn().mockResolvedValue([]),
      listByTask: vi.fn().mockResolvedValue([]),
      findById: vi.fn().mockResolvedValue(decisionDetail()),
      ...overrides.decisions,
    } as DecisionReadModel,
    sprints: {
      list: vi.fn().mockResolvedValue([]),
      listByTaskIds: vi.fn().mockResolvedValue([]),
      findById: vi.fn().mockResolvedValue(sprintDetail()),
      ...overrides.sprints,
    } as SprintReadModel,
    roadmap: {
      getGlobal: vi.fn().mockResolvedValue({ now: [], next: [], later: [] }),
      listHistory: vi.fn().mockResolvedValue([]),
      listByCompany: vi.fn().mockResolvedValue([]),
      listByTask: vi.fn().mockResolvedValue([]),
      listBySprint: vi.fn().mockResolvedValue([]),
      listByDecision: vi.fn().mockResolvedValue([]),
      findById: vi.fn().mockResolvedValue(roadmapDetail()),
      ...overrides.roadmap,
    } as RoadmapReadModel,
    relations: {
      listContacts: vi.fn().mockResolvedValue([]),
      findContact: vi.fn().mockResolvedValue(null),
      listTemplates: vi.fn().mockResolvedValue([]),
      ...overrides.relations,
    } as RelationsReadModel,
  });
}

function section(context: Awaited<ReturnType<ContextEngine["get"]>>, id: string) {
  const result = context.sections.find((entry) => entry.id === id);
  if (!result) throw new Error(`Missing section ${id}`);
  return result;
}

function task(values: Partial<TaskListItem> = {}): TaskListItem {
  return { ...baseTask(), ...values };
}

function companyDetail(values: Record<string, unknown> = {}) {
  return {
    id: "company-1",
    name: "Acme",
    status: "active" as const,
    ownerDisplayName: "Miguel",
    ownerEmail: "miguel@example.com",
    currentContext: "Piloto em preparação",
    relationshipRisks: null,
    prospectingStage: null,
    primaryContactId: null,
    updatedAt: NOW,
    ownerMemberId: "member-1",
    createdAt: NOW,
    ...values,
  };
}

function baseTask(): TaskListItem {
  return {
    id: "task-1",
    title: "Task",
    expectedResult: "Resultado",
    purpose: "work",
    status: "todo" as const,
    ownerMemberId: "member-1",
    ownerDisplayName: "Miguel",
    dueAt: null,
    blockedReason: null,
    blockedNextMove: null,
    originLabel: "Captura direta",
    originMeetingId: null,
    originDecisionId: null,
    companyIds: [] as string[],
    companyNames: [] as string[],
    meetingIds: [] as string[],
    meetingTitles: [] as string[],
    decisionIds: [] as string[],
    decisionTitles: [] as string[],
    updatedAt: NOW,
  };
}

function taskDetail(values: Partial<TaskDetail> = {}): TaskDetail {
  return {
    ...baseTask(),
    ownerMemberId: "member-1",
    completionNote: null,
    completedAt: null,
    origin: {
      type: "direct",
      meetingId: null,
      decisionId: null,
      directReason: "Necessidade operacional",
    },
    createdAt: NOW,
    ...values,
  };
}

function meeting(values: Record<string, unknown> = {}) {
  return {
    id: "meeting-1",
    title: "Meeting",
    purpose: "Alinhar",
    status: "planned" as const,
    startsAt: NOW,
    endsAt: "2026-07-16T13:00:00.000Z",
    closerDisplayName: "Miguel",
    companyNames: [] as string[],
    updatedAt: NOW,
    ...values,
  };
}

function meetingDetail(values: Record<string, unknown> = {}) {
  return {
    ...meeting(),
    intendedResult: null,
    closerMemberId: "member-1",
    agenda: null,
    notes: null,
    openQuestions: null,
    conclusion: null,
    closedAt: null,
    participants: [],
    participantMemberIds: [],
    externalParticipantNames: [],
    companyIds: [],
    createdAt: NOW,
    ...values,
  };
}

function decision(values: Record<string, unknown> = {}) {
  return {
    id: "decision-1",
    title: "Decision",
    choice: "Escolha",
    status: "current" as const,
    authorityDisplayName: "Miguel",
    decidedOn: "2026-07-16",
    originMeetingId: null,
    originMeetingTitle: null,
    updatedAt: NOW,
    ...values,
  };
}

function decisionDetail(values: Record<string, unknown> = {}) {
  return {
    ...decision(),
    reason: "Motivo",
    alternatives: null,
    impact: "Impacto",
    authorityMemberId: "member-1",
    companies: [],
    meetings: [],
    tasks: [],
    previous: null,
    revisions: [],
    createdAt: NOW,
    ...values,
  };
}

function sprint(values: Record<string, unknown> = {}) {
  return {
    id: "sprint-1",
    name: "Sprint",
    intendedResult: "Resultado",
    status: "active" as const,
    ownerDisplayName: "Miguel",
    startsOn: "2026-07-14",
    endsOn: "2026-07-20",
    taskCount: 0,
    completedTaskCount: 0,
    blockedTaskCount: 0,
    ...values,
  };
}

function sprintTask(values: Record<string, unknown> = {}) {
  return {
    taskId: "task-1",
    title: "Task",
    expectedResult: "Resultado",
    status: "todo" as const,
    ownerDisplayName: "Miguel",
    committedAt: NOW,
    closureDisposition: null,
    ...values,
  };
}

function sprintDetail(values: Record<string, unknown> = {}) {
  return {
    ...sprint(),
    ownerMemberId: "member-1",
    materialRisks: null,
    actualResult: null,
    learning: null,
    tasks: [],
    createdAt: NOW,
    updatedAt: NOW,
    ...values,
  };
}

function roadmapSummary(values: Record<string, unknown> = {}) {
  return {
    id: "roadmap-1",
    title: "Roadmap Item",
    kind: "outcome" as const,
    description: "Direção",
    evidence: "Evidência",
    horizon: "now" as const,
    lifecycleStatus: "active" as const,
    ownerDisplayName: "Miguel",
    taskCount: 0,
    sprintCount: 0,
    decisionCount: 0,
    companyCount: 0,
    updatedAt: NOW,
    ...values,
  };
}

function roadmapDetail(values: Record<string, unknown> = {}) {
  return {
    ...roadmapSummary(),
    ownerMemberId: "member-1",
    companies: [],
    tasks: [],
    sprints: [],
    decisions: [],
    createdAt: NOW,
    ...values,
  };
}
