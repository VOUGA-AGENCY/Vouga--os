import type { CostListItem } from "@/projections/costs/cost-read-model";
import type {
  ProjectMilestone,
  ProjectResource,
  ProjectScopeItem,
  ProjectStatus,
} from "@/domain/projects/project";
import type { DecisionStatus } from "@/domain/decisions/decision";
import type { MeetingKind, MeetingStatus } from "@/domain/meetings/meeting";
import type { TaskStatus } from "@/domain/tasks/task";

export type ProjectPerson = Readonly<{
  id: string;
  displayName: string;
  meta: string | null;
  avatarUrl?: string | null;
}>;

export type ProjectTaskItem = Readonly<{
  id: string;
  title: string;
  status: TaskStatus;
  ownerDisplayName: string;
  dueAt: string | null;
  completedAt: string | null;
}>;

export type ProjectMeetingItem = Readonly<{
  id: string;
  title: string;
  kind: MeetingKind;
  status: MeetingStatus;
  startsAt: string;
  endsAt: string;
}>;

export type ProjectDecisionItem = Readonly<{
  id: string;
  title: string;
  status: DecisionStatus;
  decidedOn: string;
}>;

export type ProjectStatusChange = Readonly<{
  id: string;
  fromStatus: ProjectStatus | null;
  toStatus: ProjectStatus;
  changedByDisplayName: string;
  changedAt: string;
}>;

export type ProjectListItem = Readonly<{
  id: string;
  name: string;
  status: ProjectStatus;
  client: Readonly<{ id: string; name: string }>;
  owner: Readonly<{ id: string; displayName: string }>;
  startsOn: string;
  targetDeliveryOn: string;
  agreedAmountMinor: number;
  receivedAmountMinor: number;
  currency: string;
  nextTask: ProjectTaskItem | null;
  updatedAt: string;
}>;

export type ProjectDetail = ProjectListItem &
  Readonly<{
    objective: string;
    expectedResult: string;
    team: readonly ProjectPerson[];
    contacts: readonly ProjectPerson[];
    tasks: readonly ProjectTaskItem[];
    meetings: readonly ProjectMeetingItem[];
    decisions: readonly ProjectDecisionItem[];
    costs: readonly CostListItem[];
    scopeItems: readonly ProjectScopeItem[];
    milestones: readonly ProjectMilestone[];
    resources: readonly ProjectResource[];
    statusChanges: readonly ProjectStatusChange[];
    createdAt: string;
  }>;

export interface ProjectReadModel {
  list(): Promise<ProjectListItem[]>;
  findById(id: string): Promise<ProjectDetail | null>;
}
