import type { ActiveMember } from "@/application/members/contracts";
import type { RoadmapItem, RoadmapLifecycleStatus, ValidRoadmapItemValues } from "@/domain/roadmap/roadmap-item";

export type RoadmapContextOption = Readonly<{ id: string; label: string; meta?: string }>;
export type RoadmapFormOptions = Readonly<{
  members: readonly ActiveMember[];
  companies: readonly RoadmapContextOption[];
  tasks: readonly RoadmapContextOption[];
  sprints: readonly RoadmapContextOption[];
  decisions: readonly RoadmapContextOption[];
}>;

export interface RoadmapContextDirectory {
  getOptions(): Promise<Omit<RoadmapFormOptions, "members">>;
  referencesExist(values: Pick<ValidRoadmapItemValues, "companyIds" | "taskIds" | "sprintIds" | "decisionIds">): Promise<boolean>;
}

export interface RoadmapItemRepository {
  findById(id: string): Promise<RoadmapItem | null>;
  create(values: ValidRoadmapItemValues): Promise<RoadmapItem>;
  update(item: RoadmapItem, values: ValidRoadmapItemValues): Promise<RoadmapItem>;
  finish(item: RoadmapItem, status: Extract<RoadmapLifecycleStatus, "completed" | "abandoned">): Promise<RoadmapItem>;
}
