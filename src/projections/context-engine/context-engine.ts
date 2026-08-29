import { DECISION_STATUS_LABELS, type DecisionStatus } from "@/domain/decisions/decision";
import { MEETING_STATUS_LABELS, type MeetingStatus } from "@/domain/meetings/meeting";
import { ROADMAP_HORIZON_LABELS, type RoadmapHorizon } from "@/domain/roadmap/roadmap-item";
import { SPRINT_STATUS_LABELS, type SprintStatus } from "@/domain/sprints/sprint";
import { TASK_STATUS_LABELS, type TaskStatus } from "@/domain/tasks/task";
import { PROSPECTING_STAGE_LABELS } from "@/domain/companies/company";
import type { CompanyReadModel } from "@/projections/companies/company-read-model";
import type { CostReadModel } from "@/projections/costs/cost-read-model";
import type { DecisionReadModel } from "@/projections/decisions/decision-read-model";
import type { MeetingReadModel } from "@/projections/meetings/meeting-read-model";
import type { RoadmapReadModel } from "@/projections/roadmap/roadmap-read-model";
import type { SprintReadModel } from "@/projections/sprints/sprint-read-model";
import type { TaskDetail, TaskReadModel } from "@/projections/tasks/task-read-model";
import type { RelationsReadModel } from "@/projections/relations/relations-read-model";

export type ContextTarget =
  | Readonly<{ type: "company"; id: string }>
  | Readonly<{ type: "task"; id: string }>
  | Readonly<{ type: "meeting"; id: string }>
  | Readonly<{ type: "decision"; id: string }>
  | Readonly<{ type: "sprint"; id: string }>
  | Readonly<{ type: "roadmap-item"; id: string }>
  | Readonly<{ type: "cost"; id: string }>
  | Readonly<{ type: "contact"; id: string }>;

export type ContextItem = Readonly<{
  id: string;
  label: string;
  href: string | null;
  meta: string | null;
}>;

export type ContextSection = Readonly<{
  id: string;
  title: string;
  source: string;
  status: "ready" | "empty" | "error";
  items: readonly ContextItem[];
  message: string | null;
}>;

export type ObjectContext = Readonly<{
  target: ContextTarget;
  sections: readonly ContextSection[];
  isPartial: boolean;
}>;

export type GraphNodeType =
  | "company"
  | "contact"
  | "meeting"
  | "task"
  | "sprint"
  | "decision"
  | "cost"
  | "roadmap";

export type GraphNode = Readonly<{
  id: string;
  type: GraphNodeType;
  label: string;
  sublabel: string | null;
  status: string | null;
  href: string;
  layer: number;
  connectionsCount: number;
}>;

export type GraphEdge = Readonly<{
  id: string;
  source: string;
  target: string;
  relation: string;
}>;

export type FullContextGraph = Readonly<{
  nodes: readonly GraphNode[];
  edges: readonly GraphEdge[];
  stats: Readonly<{
    totalEntities: number;
    totalConnections: number;
    densityScore: number;
    activeClusters: number;
  }>;
}>;

type ContextReadModels = Readonly<{
  companies: CompanyReadModel;
  costs: CostReadModel;
  tasks: TaskReadModel;
  meetings: MeetingReadModel;
  decisions: DecisionReadModel;
  sprints: SprintReadModel;
  roadmap: RoadmapReadModel;
  relations: RelationsReadModel;
}>;

type SectionRequest = Readonly<{
  id: string;
  title: string;
  source: string;
  load: () => Promise<unknown>;
  items: (value: unknown) => readonly ContextItem[];
  emptyMessage: string;
}>;

export class ContextEngine {
  constructor(private readonly readModels: ContextReadModels) {}

  async get(target: ContextTarget, nowIso: string, role: string = "admin"): Promise<ObjectContext> {
    const requests = this.requestsFor(target, nowIso, role);
    const sections = await Promise.all(requests.map(loadSection));
    return {
      target,
      sections,
      isPartial: sections.some((section) => section.status === "error"),
    };
  }

  private requestsFor(target: ContextTarget, nowIso: string, role: string = "admin"): readonly SectionRequest[] {
    switch (target.type) {
      case "company":
        return this.companyRequests(target.id, nowIso, role);
      case "task":
        return this.taskRequests(target.id, role);
      case "meeting":
        return this.meetingRequests(target.id, nowIso);
      case "decision":
        return this.decisionRequests(target.id, role);
      case "sprint":
        return this.sprintRequests(target.id, role);
      case "roadmap-item":
        return this.roadmapRequests(target.id, role);
      case "cost":
        return role === "admin" ? this.costRequests(target.id) : [];
      case "contact":
        return this.contactRequests(target.id);
    }
  }

  async getFullGraph(nowIso: string, role: string = "admin"): Promise<FullContextGraph> {
    const isCostAllowed = role === "admin";
    const [companies, contacts, meetings, tasks, sprints, decisions, globalRoadmap, costs] =
      await Promise.all([
        this.readModels.companies.list(),
        this.readModels.relations.listContacts(),
        this.readModels.meetings.list(nowIso),
        this.readModels.tasks.list(),
        this.readModels.sprints.list(),
        this.readModels.decisions.list(),
        this.readModels.roadmap.getGlobal(),
        isCostAllowed ? this.readModels.costs.list() : Promise.resolve([]),
      ]);
    const roadmap = [...globalRoadmap.now, ...globalRoadmap.next, ...globalRoadmap.later];

    const nodeMap = new Map<string, GraphNode>();
    const edges: GraphEdge[] = [];
    const edgeSet = new Set<string>();

    const addEdge = (source: string, target: string, relation: string) => {
      if (!source || !target || source === target) return;
      const key = `${source}->${target}:${relation}`;
      if (edgeSet.has(key)) return;
      edgeSet.add(key);
      edges.push({ id: key, source, target, relation });
    };

    // Layer 0: Companies & Contacts
    for (const c of companies) {
      nodeMap.set(`company:${c.id}`, {
        id: `company:${c.id}`,
        type: "company",
        label: c.name,
        sublabel: c.prospectingStage ? PROSPECTING_STAGE_LABELS[c.prospectingStage] : "Organisation",
        status: c.status,
        href: `/companies/${c.id}`,
        layer: 0,
        connectionsCount: 0,
      });
    }

    for (const ct of contacts) {
      nodeMap.set(`contact:${ct.id}`, {
        id: `contact:${ct.id}`,
        type: "contact",
        label: ct.displayName,
        sublabel: ct.jobTitle ?? "Perfil",
        status: ct.status,
        href: `/relations/contacts/${ct.id}`,
        layer: 0,
        connectionsCount: 0,
      });
      if (ct.companyId) {
        addEdge(`contact:${ct.id}`, `company:${ct.companyId}`, "Organização");
      }
    }

    // Layer 1: Meetings
    for (const m of meetings) {
      nodeMap.set(`meeting:${m.id}`, {
        id: `meeting:${m.id}`,
        type: "meeting",
        label: m.title,
        sublabel: m.companyNames.join(", ") || "Meeting",
        status: m.status,
        href: `/meetings/${m.id}`,
        layer: 1,
        connectionsCount: 0,
      });
      for (const name of m.companyNames) {
        const matchingCompany = companies.find((c) => c.name === name);
        if (matchingCompany) {
          addEdge(`meeting:${m.id}`, `company:${matchingCompany.id}`, "Contexto de Organização");
        }
      }
    }

    // Layer 2: Tasks
    for (const t of tasks) {
      nodeMap.set(`task:${t.id}`, {
        id: `task:${t.id}`,
        type: "task",
        label: t.title,
        sublabel: t.ownerDisplayName,
        status: t.status,
        href: `/tasks/${t.id}`,
        layer: 2,
        connectionsCount: 0,
      });
      for (const cid of t.companyIds) {
        addEdge(`task:${t.id}`, `company:${cid}`, "Trabalho de Organização");
      }
      if (t.originMeetingId) {
        addEdge(`task:${t.id}`, `meeting:${t.originMeetingId}`, "Origem em Meeting");
      }
      if (t.originDecisionId) {
        addEdge(`task:${t.id}`, `decision:${t.originDecisionId}`, "Origem em Decision");
      }
    }

    // Layer 3: Sprints
    for (const s of sprints) {
      nodeMap.set(`sprint:${s.id}`, {
        id: `sprint:${s.id}`,
        type: "sprint",
        label: s.name,
        sublabel: `${s.taskCount} Tasks`,
        status: s.status,
        href: `/sprints/${s.id}`,
        layer: 3,
        connectionsCount: 0,
      });
    }

    // Layer 4: Decisions & Costs
    for (const d of decisions) {
      nodeMap.set(`decision:${d.id}`, {
        id: `decision:${d.id}`,
        type: "decision",
        label: d.title,
        sublabel: d.choice,
        status: d.status,
        href: `/decisions/${d.id}`,
        layer: 4,
        connectionsCount: 0,
      });
      if (d.originMeetingId) {
        addEdge(`decision:${d.id}`, `meeting:${d.originMeetingId}`, "Origem em Meeting");
      }
    }

    if (isCostAllowed) {
      for (const cost of costs) {
        nodeMap.set(`cost:${cost.id}`, {
          id: `cost:${cost.id}`,
          type: "cost",
          label: cost.title || cost.description,
          sublabel: `${cost.currency} ${(cost.expectedAmountMinor / 100).toFixed(2)}`,
          status: cost.status,
          href: `/costs/${cost.id}`,
          layer: 4,
          connectionsCount: 0,
        });
        if (cost.companyName) {
          const matchingCompany = companies.find((c) => c.name === cost.companyName);
          if (matchingCompany) {
            addEdge(`cost:${cost.id}`, `company:${matchingCompany.id}`, "Custo de Organização");
          }
        }
        if (cost.sourceDecisionTitle) {
          const matchingDecision = decisions.find((d) => d.title === cost.sourceDecisionTitle);
          if (matchingDecision) {
            addEdge(`cost:${cost.id}`, `decision:${matchingDecision.id}`, "Origem em Decisão");
          }
        }
      }
    }

    // Layer 5: Roadmap Items
    for (const r of roadmap) {
      nodeMap.set(`roadmap:${r.id}`, {
        id: `roadmap:${r.id}`,
        type: "roadmap",
        label: r.title,
        sublabel: r.horizon,
        status: r.lifecycleStatus,
        href: `/roadmap/${r.id}`,
        layer: 5,
        connectionsCount: 0,
      });
    }

    const rawNodes = Array.from(nodeMap.values());
    const nodes: GraphNode[] = rawNodes.map((node) => {
      const count = edges.filter((e) => e.source === node.id || e.target === node.id).length;
      return { ...node, connectionsCount: count };
    });

    const totalEntities = nodes.length;
    const totalConnections = edges.length;
    const densityScore = totalEntities > 1 ? Number((totalConnections / totalEntities).toFixed(2)) : 0;
    const activeClusters = new Set(nodes.map((n) => n.layer)).size;

    return {
      nodes,
      edges,
      stats: {
        totalEntities,
        totalConnections,
        densityScore,
        activeClusters,
      },
    };
  }

  private companyRequests(companyId: string, nowIso: string, role?: string): readonly SectionRequest[] {
    const tasks = this.readModels.tasks.listByCompany(companyId);
    const list = [
      request(
        "company-contacts",
        "Pessoas relacionadas",
        "Contacts",
        () => this.readModels.relations.listContacts(),
        (value) =>
          (value as Awaited<ReturnType<RelationsReadModel["listContacts"]>>)
            .filter((item) => item.companyId === companyId)
            .map((item) => ({
              id: item.id,
              label: item.displayName,
              href: `/relations/contacts/${item.id}`,
              meta: item.jobTitle,
            })),
        "Sem Perfis reconhecidos nesta Organisation.",
      ),
      request(
        "company-tasks",
        "Trabalho relacionado",
        "Tasks",
        () => tasks,
        taskItems,
        "Sem Tasks relacionadas.",
      ),
      request(
        "company-meetings",
        "Conversas relacionadas",
        "Meetings",
        () => this.readModels.meetings.listByCompany(companyId, nowIso),
        meetingItems,
        "Sem Meetings relacionadas.",
      ),
      request(
        "company-decisions",
        "Escolhas relacionadas",
        "Decisions",
        () => this.readModels.decisions.listByCompany(companyId),
        decisionItems,
        "Sem Decisions relacionadas.",
      ),
      request(
        "company-sprints",
        "Compromissos relacionados",
        "Sprints através das Tasks relacionadas",
        () =>
          tasks.then((items) =>
            this.readModels.sprints.listByTaskIds(items.map((item) => item.id)),
          ),
        sprintItems,
        "Sem Sprints relacionadas através do trabalho existente.",
      ),
      request(
        "company-roadmap",
        "Direção relacionada",
        "Roadmap Items",
        () => this.readModels.roadmap.listByCompany(companyId),
        roadmapItems,
        "Sem Roadmap Items relacionados.",
      ),
    ];

    if (role === "admin") {
      list.push(
        request(
          "company-costs",
          "Custos relacionados",
          "Costs",
          () => this.readModels.costs.listByCompany(companyId),
          costItems,
          "Sem Costs relacionados.",
        ),
      );
    }

    return list;
  }

  private contactRequests(contactId: string): readonly SectionRequest[] {
    const contact = required(
      this.readModels.relations.findContact(contactId),
      "Contact não encontrado.",
    );
    return [
      request(
        "contact-company",
        "Organização atual",
        "Contacts",
        () => contact,
        (value) => {
          const item = value as Awaited<ReturnType<RelationsReadModel["findContact"]>>;
          return item?.companyId
            ? [
                {
                  id: item.companyId,
                  label: item.companyName ?? "Organização",
                  href: `/companies/${item.companyId}`,
                  meta: null,
                },
              ]
            : [];
        },
        "Este Perfil não está associado a uma Organisation.",
      ),
      request(
        "contact-meetings",
        "Conversas relacionadas",
        "Meetings",
        () => contact,
        (value) => {
          const item = value as Awaited<ReturnType<RelationsReadModel["findContact"]>>;
          return (item?.meetings ?? []).map((meeting) => ({
            id: meeting.id,
            label: meeting.title,
            href: `/meetings/${meeting.id}`,
            meta: meeting.status,
          }));
        },
        "Sem Meetings reconhecidas para este Perfil.",
      ),
    ];
  }

  private taskRequests(taskId: string, role?: string): readonly SectionRequest[] {
    const task = required(this.readModels.tasks.findById(taskId), "Task não encontrada.");
    const list = [
      request(
        "task-origin",
        "Origem demonstrável",
        "Task",
        () => task,
        originItems,
        "Sem origem disponível.",
      ),
      request(
        "task-companies",
        "Organisations relacionadas",
        "Organisations através das relações da Task",
        () =>
          task.then((value) =>
            Promise.all(value.companyIds.map((id) => this.readModels.companies.findById(id))),
          ),
        companyItems,
        "Sem Organisations relacionadas.",
      ),
      request(
        "task-meetings",
        "Meetings relacionadas",
        "Task",
        () => task,
        meetingItemsFromTask,
        "Sem Meetings relacionadas.",
      ),
      request(
        "task-decisions",
        "Decisions relacionadas",
        "Decisions",
        () => this.readModels.decisions.listByTask(taskId),
        decisionItems,
        "Sem Decisions relacionadas.",
      ),
      request(
        "task-sprints",
        "Compromissos de Sprint",
        "Sprints",
        () => this.readModels.sprints.listByTaskIds([taskId]),
        sprintItems,
        "Esta Task ainda não pertence a uma Sprint.",
      ),
      request(
        "task-roadmap",
        "Direção relacionada",
        "Roadmap Items",
        () => this.readModels.roadmap.listByTask(taskId),
        roadmapItems,
        "Sem Roadmap Items relacionados.",
      ),
    ];

    if (role === "admin") {
      list.push(
        request(
          "task-costs",
          "Custos relacionados",
          "Costs",
          () => this.readModels.costs.listByTask(taskId),
          costItems,
          "Sem Costs relacionados.",
        ),
      );
    }

    return list;
  }

  private meetingRequests(meetingId: string, nowIso: string): readonly SectionRequest[] {
    const meeting = required(
      this.readModels.meetings.findById(meetingId, nowIso),
      "Meeting não encontrada.",
    );
    return [
      request(
        "meeting-companies",
        "Contexto anterior disponível",
        "Organisations relacionadas",
        () =>
          meeting.then((value) =>
            Promise.all(value.companyIds.map((id) => this.readModels.companies.findById(id))),
          ),
        companyItems,
        "Sem Organisation relacionada para fornecer contexto anterior.",
      ),
      request(
        "meeting-tasks",
        "Tasks resultantes ou relacionadas",
        "Tasks",
        () => this.readModels.tasks.listByMeeting(meetingId),
        (tasks) =>
          tasks.map((task) =>
            item(
              task.id,
              task.title,
              `/tasks/${task.id}`,
              task.originMeetingId === meetingId
                ? "Originada nesta Meeting"
                : TASK_STATUS_LABELS[task.status],
            ),
          ),
        "Sem Tasks resultantes ou relacionadas.",
      ),
      request(
        "meeting-decisions",
        "Decisions resultantes ou relacionadas",
        "Decisions",
        () => this.readModels.decisions.listByMeeting(meetingId),
        (decisions) =>
          decisions.map((decision) =>
            item(
              decision.id,
              decision.title,
              `/decisions/${decision.id}`,
              decision.originMeetingId === meetingId
                ? "Tomada nesta Meeting"
                : DECISION_STATUS_LABELS[decision.status],
            ),
          ),
        "Sem Decisions resultantes ou relacionadas.",
      ),
    ];
  }

  private decisionRequests(decisionId: string, role?: string): readonly SectionRequest[] {
    const decision = required(
      this.readModels.decisions.findById(decisionId),
      "Decision não encontrada.",
    );
    const taskIds = decision.then((value) => value.tasks.map((task) => task.id));
    const list = [
      request(
        "decision-origin",
        "Origem",
        "Decision",
        () => decision,
        (value) =>
          value.originMeetingId && value.originMeetingTitle
            ? [
                item(
                  value.originMeetingId,
                  value.originMeetingTitle,
                  `/meetings/${value.originMeetingId}`,
                  "Meeting de origem",
                ),
              ]
            : [],
        "Decision tomada diretamente, sem Meeting de origem.",
      ),
      request(
        "decision-companies",
        "Organisations afetadas",
        "Decision",
        () => decision,
        (value) => contextLinks(value.companies, "companies"),
        "Sem Organisations afetadas.",
      ),
      request(
        "decision-meetings",
        "Meetings relacionadas",
        "Decision",
        () => decision,
        (value) => contextLinks(value.meetings, "meetings"),
        "Sem Meetings relacionadas.",
      ),
      request(
        "decision-tasks",
        "Trabalho relacionado",
        "Decision",
        () => decision,
        (value) => contextLinks(value.tasks, "tasks"),
        "Sem Tasks relacionadas.",
      ),
      request(
        "decision-sprints",
        "Compromissos relacionados",
        "Sprints através das Tasks relacionadas",
        () => taskIds.then((ids) => this.readModels.sprints.listByTaskIds(ids)),
        sprintItems,
        "Sem Sprints relacionadas através do trabalho existente.",
      ),
      request(
        "decision-roadmap",
        "Direção relacionada",
        "Roadmap Items",
        () => this.readModels.roadmap.listByDecision(decisionId),
        roadmapItems,
        "Sem Roadmap Items relacionados.",
      ),
    ];

    if (role === "admin") {
      list.push(
        request(
          "decision-costs",
          "Custos resultantes",
          "Costs",
          () => this.readModels.costs.listByDecision(decisionId),
          costItems,
          "Sem Costs originados por esta Decision.",
        ),
      );
    }

    return list;
  }

  private sprintRequests(sprintId: string, role?: string): readonly SectionRequest[] {
    const sprint = required(this.readModels.sprints.findById(sprintId), "Sprint não encontrada.");
    const taskDetails = sprint.then((value) =>
      Promise.all(
        value.tasks.map((task) =>
          required(this.readModels.tasks.findById(task.taskId), "Task comprometida indisponível."),
        ),
      ),
    );
    const list = [
      request(
        "sprint-tasks",
        "Compromisso",
        "Sprint e Tasks",
        () => sprint,
        (value) =>
          value.tasks.map((task) =>
            item(task.taskId, task.title, `/tasks/${task.taskId}`, TASK_STATUS_LABELS[task.status]),
          ),
        "Sem Tasks comprometidas.",
      ),
      request(
        "sprint-companies",
        "Organisations ligadas ao trabalho",
        "Organisations através das Tasks relacionadas",
        () =>
          taskDetails.then(async (tasks) => {
            const ids = [...new Set(tasks.flatMap((task) => task.companyIds))];
            return Promise.all(ids.map((id) => this.readModels.companies.findById(id)));
          }),
        companyItems,
        "Sem Organisations relacionadas através das Tasks.",
      ),
      request(
        "sprint-meetings",
        "Meetings ligadas ao trabalho",
        "Tasks relacionadas",
        () => taskDetails,
        meetingItemsFromTasks,
        "Sem Meetings relacionadas através das Tasks.",
      ),
      request(
        "sprint-decisions",
        "Decisions ligadas ao trabalho",
        "Decisions relacionadas com as Tasks",
        () =>
          sprint.then(async (value) => {
            const groups = await Promise.all(
              value.tasks.map((task) => this.readModels.decisions.listByTask(task.taskId)),
            );
            return unique(
              groups
                .flat()
                .map((decision) =>
                  item(
                    decision.id,
                    decision.title,
                    `/decisions/${decision.id}`,
                    DECISION_STATUS_LABELS[decision.status],
                  ),
                ),
            );
          }),
        (items) => items,
        "Sem Decisions relacionadas através das Tasks.",
      ),
      request(
        "sprint-roadmap",
        "Direção relacionada",
        "Roadmap Items",
        () => this.readModels.roadmap.listBySprint(sprintId),
        roadmapItems,
        "Sem Roadmap Items relacionados.",
      ),
    ];

    if (role === "admin") {
      list.push(
        request(
          "sprint-costs",
          "Custos ligados ao trabalho",
          "Costs através das Tasks comprometidas",
          () =>
            sprint.then((value) =>
              this.readModels.costs.listByTaskIds(value.tasks.map((task) => task.taskId)),
            ),
          costItems,
          "Sem Costs relacionados através das Tasks.",
        ),
      );
    }

    return list;
  }

  private roadmapRequests(roadmapItemId: string, role?: string): readonly SectionRequest[] {
    const roadmapItem = required(
      this.readModels.roadmap.findById(roadmapItemId),
      "Roadmap Item não encontrado.",
    );
    const list = [
      request(
        "roadmap-decisions",
        "Decisions justificativas",
        "Roadmap Item",
        () => roadmapItem,
        (value) => contextLinks(value.decisions, "decisions"),
        "Sem Decisions relacionadas.",
      ),
      request(
        "roadmap-tasks",
        "Execução relacionada",
        "Roadmap Item e Tasks",
        () => roadmapItem,
        (value) => contextLinks(value.tasks, "tasks"),
        "Sem Tasks relacionadas.",
      ),
      request(
        "roadmap-companies",
        "Organisations relacionadas",
        "Roadmap Item",
        () => roadmapItem,
        (value) => contextLinks(value.companies, "companies"),
        "Sem Organisations relacionadas.",
      ),
      request(
        "roadmap-sprints",
        "Compromissos relacionados",
        "Roadmap Item e Sprints",
        () => roadmapItem,
        (value) => contextLinks(value.sprints, "sprints"),
        "Sem Sprints relacionadas.",
      ),
    ];

    if (role === "admin") {
      list.push(
        request(
          "roadmap-costs",
          "Custos de suporte",
          "Costs",
          () => this.readModels.costs.listByRoadmapItem(roadmapItemId),
          costItems,
          "Sem Costs associados.",
        ),
      );
    }

    return list;
  }

  private costRequests(costId: string): readonly SectionRequest[] {
    const cost = required(this.readModels.costs.findById(costId), "Cost não encontrado.");
    return [
      request(
        "cost-reason",
        "Razão operacional",
        "Cost",
        () => cost,
        (value) => [item(value.id, value.description, null, "Descrição registada")],
        "Sem razão registada.",
      ),
      request(
        "cost-decision",
        "Decision de origem",
        "Cost",
        () => cost,
        (value) =>
          value.sourceDecision
            ? [
                item(
                  value.sourceDecision.id,
                  value.sourceDecision.label,
                  `/decisions/${value.sourceDecision.id}`,
                  value.sourceDecision.meta ?? null,
                ),
              ]
            : [],
        "Sem Decision de origem.",
      ),
      request(
        "cost-company",
        "Organisation relacionada",
        "Cost",
        () => cost,
        (value) =>
          value.company
            ? [item(value.company.id, value.company.label, `/companies/${value.company.id}`, null)]
            : [],
        "Sem Organisation relacionada.",
      ),
      request(
        "cost-roadmap",
        "Roadmap Item suportado",
        "Cost",
        () => cost,
        (value) =>
          value.roadmapItem
            ? [
                item(
                  value.roadmapItem.id,
                  value.roadmapItem.label,
                  `/roadmap/${value.roadmapItem.id}`,
                  value.roadmapItem.meta ?? null,
                ),
              ]
            : [],
        "Sem Roadmap Item relacionado.",
      ),
      request(
        "cost-tasks",
        "Tasks dependentes",
        "Cost",
        () => cost,
        (value) => contextLinks(value.tasks, "tasks"),
        "Sem Tasks relacionadas.",
      ),
      request(
        "cost-sprints",
        "Sprints através das Tasks",
        "Sprints e Tasks relacionadas",
        () =>
          cost.then((value) =>
            this.readModels.sprints.listByTaskIds(value.tasks.map((task) => task.id)),
          ),
        sprintItems,
        "Sem Sprints relacionadas através das Tasks.",
      ),
    ];
  }
}

function request<T>(
  id: string,
  title: string,
  source: string,
  load: () => Promise<T>,
  items: (value: T) => readonly ContextItem[],
  emptyMessage: string,
): SectionRequest {
  return {
    id,
    title,
    source,
    load,
    items: (value) => items(value as T),
    emptyMessage,
  };
}

async function loadSection(request: SectionRequest): Promise<ContextSection> {
  try {
    const items = request.items(await request.load());
    return {
      id: request.id,
      title: request.title,
      source: request.source,
      status: items.length > 0 ? "ready" : "empty",
      items,
      message: items.length > 0 ? null : request.emptyMessage,
    };
  } catch {
    return {
      id: request.id,
      title: request.title,
      source: request.source,
      status: "error",
      items: [],
      message: `Não foi possível ler ${request.source}.`,
    };
  }
}

async function required<T>(promise: Promise<T | null>, message: string): Promise<T> {
  const value = await promise;
  if (!value) throw new Error(message);
  return value;
}

function item(id: string, label: string, href: string | null, meta: string | null): ContextItem {
  return { id, label, href, meta };
}

function taskItems(
  tasks: readonly {
    id: string;
    title: string;
    status: TaskStatus;
  }[],
) {
  return tasks.map((task) =>
    item(task.id, task.title, `/tasks/${task.id}`, TASK_STATUS_LABELS[task.status]),
  );
}

function meetingItems(
  meetings: readonly {
    id: string;
    title: string;
    status: MeetingStatus;
  }[],
) {
  return meetings.map((meeting) =>
    item(
      meeting.id,
      meeting.title,
      `/meetings/${meeting.id}`,
      MEETING_STATUS_LABELS[meeting.status],
    ),
  );
}

function decisionItems(
  decisions: readonly {
    id: string;
    title: string;
    status: DecisionStatus;
  }[],
) {
  return decisions.map((decision) =>
    item(
      decision.id,
      decision.title,
      `/decisions/${decision.id}`,
      DECISION_STATUS_LABELS[decision.status],
    ),
  );
}

function sprintItems(
  sprints: readonly {
    id: string;
    name: string;
    status: SprintStatus;
  }[],
) {
  return sprints.map((sprint) =>
    item(sprint.id, sprint.name, `/sprints/${sprint.id}`, SPRINT_STATUS_LABELS[sprint.status]),
  );
}

function roadmapItems(
  items: readonly {
    id: string;
    title: string;
    horizon: RoadmapHorizon;
  }[],
) {
  return items.map((roadmapItem) =>
    item(
      roadmapItem.id,
      roadmapItem.title,
      `/roadmap/${roadmapItem.id}`,
      ROADMAP_HORIZON_LABELS[roadmapItem.horizon],
    ),
  );
}

function costItems(
  costs: readonly {
    id: string;
    title: string;
    status: string;
    currency: string;
    expectedAmountMinor: number;
    actualAmountMinor: number | null;
  }[],
) {
  return costs.map((cost) =>
    item(
      cost.id,
      cost.title,
      `/costs/${cost.id}`,
      `${cost.status} · ${new Intl.NumberFormat("pt-PT", { style: "currency", currency: cost.currency }).format((cost.actualAmountMinor ?? cost.expectedAmountMinor) / 100)}`,
    ),
  );
}

function originItems(task: TaskDetail): readonly ContextItem[] {
  switch (task.origin.type) {
    case "planning":
      return [item(task.id, "Planeamento", null, "Origem base")];
    case "google_event":
      return [
        item(
          task.origin.googleEvent.eventId,
          "Google Event",
          `/calendar/google-event/${encodeURIComponent(task.origin.googleEvent.eventId)}?calendar=${encodeURIComponent(task.origin.googleEvent.calendarId)}`,
          "Evento de origem",
        ),
      ];
    case "meeting":
      return [
        item(
          task.origin.meetingId,
          task.originLabel,
          `/meetings/${task.origin.meetingId}`,
          "Meeting de origem",
        ),
      ];
    case "decision":
      return [
        item(
          task.origin.decisionId,
          task.originLabel,
          `/decisions/${task.origin.decisionId}`,
          "Decision de origem",
        ),
      ];
    case "direct":
      return [item(task.id, "Captura direta", null, task.origin.directReason)];
  }
}

function meetingItemsFromTask(task: TaskDetail): readonly ContextItem[] {
  return task.meetingIds.map((id, index) =>
    item(id, task.meetingTitles[index] ?? "Meeting relacionada", `/meetings/${id}`, null),
  );
}

function companyItems(companies: readonly Awaited<ReturnType<CompanyReadModel["findById"]>>[]) {
  return companies.flatMap((company) =>
    company
      ? [
          item(
            company.id,
            company.name,
            `/companies/${company.id}`,
            company.currentContext ?? COMPANY_STATUS_LABELS[company.status],
          ),
        ]
      : [],
  );
}

function meetingItemsFromTasks(tasks: readonly TaskDetail[]) {
  return unique(tasks.flatMap(meetingItemsFromTask));
}

function contextLinks(
  links: readonly { id: string; label: string; meta?: string }[],
  path: "companies" | "meetings" | "tasks" | "decisions" | "sprints",
) {
  return links.map((link) => item(link.id, link.label, `/${path}/${link.id}`, link.meta ?? null));
}

function unique(items: readonly ContextItem[]): ContextItem[] {
  return [...new Map(items.map((entry) => [entry.id, entry])).values()];
}
import { COMPANY_STATUS_LABELS } from "@/domain/companies/company";
