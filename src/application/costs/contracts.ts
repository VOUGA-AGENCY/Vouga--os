import type { ActiveMember } from "@/application/members/contracts";
import type { Cost, ValidCostValues } from "@/domain/costs/cost";

export type CostContextOption = Readonly<{ id: string; label: string; meta?: string }>;

export type CostFormOptions = Readonly<{
  members: readonly ActiveMember[];
  companies: readonly CostContextOption[];
  roadmapItems: readonly CostContextOption[];
  decisions: readonly CostContextOption[];
  tasks: readonly CostContextOption[];
}>;

export interface CostContextDirectory {
  getOptions(): Promise<Omit<CostFormOptions, "members">>;
  referencesExist(
    values: Pick<ValidCostValues, "companyId" | "roadmapItemId" | "sourceDecisionId" | "taskIds">,
  ): Promise<boolean>;
}

export interface CostRepository {
  findById(id: string): Promise<Cost | null>;
  create(values: ValidCostValues): Promise<Cost>;
  update(cost: Cost, values: ValidCostValues): Promise<Cost>;
  activate(cost: Cost): Promise<Cost>;
  pay(cost: Cost, actualAmountMinor: number, paidOn: string): Promise<Cost>;
  end(cost: Cost, endedOn: string): Promise<Cost>;
  cancel(cost: Cost, cancelledOn: string): Promise<Cost>;
}

export type CashBalanceSnapshot = Readonly<{
  id: string;
  balanceMinor: number;
  currency: string;
  confirmedAt: string;
  confirmedByMemberId: string;
  confirmedByDisplayName: string;
  description: string | null;
  createdAt: string;
}>;

export interface CashBalanceRepository {
  create(values: {
    balanceMinor: number;
    currency: string;
    confirmedAt: string;
    confirmedByMemberId: string;
    description?: string | null;
  }): Promise<CashBalanceSnapshot>;
}
