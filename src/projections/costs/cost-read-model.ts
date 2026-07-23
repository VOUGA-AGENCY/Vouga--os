import type { CostCategory, CostRecurrence, CostStatus, CostType } from "@/domain/costs/cost";
import type { CashBalanceSnapshot } from "@/application/costs/contracts";

export type CostContextLink = Readonly<{ id: string; label: string; meta?: string }>;

export type CostListItem = Readonly<{
  id: string;
  title: string;
  description: string;
  category: CostCategory;
  supplier: string | null;
  expectedAmountMinor: number;
  actualAmountMinor: number | null;
  currency: string;
  costType: CostType;
  recurrence: CostRecurrence | null;
  expectedOn: string | null;
  startsOn: string | null;
  billingAnchorOn: string | null;
  paidOn: string | null;
  endedOn: string | null;
  cancelledOn: string | null;
  status: CostStatus;
  ownerMemberId: string | null;
  ownerDisplayName: string | null;
  companyName: string | null;
  roadmapItemTitle: string | null;
  sourceDecisionTitle: string | null;
  taskCount: number;
  createdAt: string;
  updatedAt: string;
}>;

export type CostDetail = CostListItem &
  Readonly<{
    company: CostContextLink | null;
    roadmapItem: CostContextLink | null;
    sourceDecision: CostContextLink | null;
    tasks: readonly CostContextLink[];
  }>;

export interface CostReadModel {
  list(): Promise<CostListItem[]>;
  findById(id: string): Promise<CostDetail | null>;
  listByCompany(companyId: string): Promise<CostListItem[]>;
  listByRoadmapItem(roadmapItemId: string): Promise<CostListItem[]>;
  listByDecision(decisionId: string): Promise<CostListItem[]>;
  listByTask(taskId: string): Promise<CostListItem[]>;
  listByTaskIds(taskIds: readonly string[]): Promise<CostListItem[]>;
  listCashBalances(): Promise<CashBalanceSnapshot[]>;
}
