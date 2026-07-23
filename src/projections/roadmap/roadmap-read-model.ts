import type { RoadmapHorizon, RoadmapKind, RoadmapLifecycleStatus } from "@/domain/roadmap/roadmap-item";

export type RoadmapContextLink = Readonly<{ id: string; label: string; meta?: string }>;
export type RoadmapItemSummary = Readonly<{
  id: string;
  title: string;
  kind: RoadmapKind;
  description: string;
  evidence: string;
  horizon: RoadmapHorizon;
  lifecycleStatus: RoadmapLifecycleStatus;
  ownerDisplayName: string | null;
  taskCount: number;
  sprintCount: number;
  decisionCount: number;
  companyCount: number;
  updatedAt: string;
}>;
export type GlobalRoadmapProjection = Readonly<{
  now: readonly RoadmapItemSummary[];
  next: readonly RoadmapItemSummary[];
  later: readonly RoadmapItemSummary[];
}>;
export type RoadmapItemDetail = RoadmapItemSummary & Readonly<{
  ownerMemberId: string | null;
  companies: readonly RoadmapContextLink[];
  tasks: readonly RoadmapContextLink[];
  sprints: readonly RoadmapContextLink[];
  decisions: readonly RoadmapContextLink[];
  createdAt: string;
}>;
export interface RoadmapReadModel {
  getGlobal(): Promise<GlobalRoadmapProjection>;
  listHistory(): Promise<RoadmapItemSummary[]>;
  listByCompany(companyId: string): Promise<RoadmapItemSummary[]>;
  listByTask(taskId: string): Promise<RoadmapItemSummary[]>;
  listBySprint(sprintId: string): Promise<RoadmapItemSummary[]>;
  listByDecision(decisionId: string): Promise<RoadmapItemSummary[]>;
  findById(id: string): Promise<RoadmapItemDetail | null>;
}
