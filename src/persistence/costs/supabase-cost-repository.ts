import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { CostRepository } from "@/application/costs/contracts";
import type {
  Cost,
  CostCategory,
  CostRecurrence,
  CostStatus,
  CostType,
  ValidCostValues,
} from "@/domain/costs/cost";

type Row = {
  id: string;
  title: string;
  description: string;
  category: CostCategory;
  supplier: string | null;
  expected_amount_minor: number;
  actual_amount_minor: number | null;
  currency: string;
  cost_type: CostType;
  recurrence: CostRecurrence | null;
  expected_on: string | null;
  starts_on: string | null;
  billing_anchor_on: string | null;
  paid_on: string | null;
  ended_on: string | null;
  cancelled_on: string | null;
  status: CostStatus;
  owner_member_id: string | null;
  company_id: string | null;
  roadmap_item_id: string | null;
  source_decision_id: string | null;
  created_at: string;
  updated_at: string;
  cost_tasks: { task_id: string }[];
};
const SELECT =
  "id,title,description,category,supplier,expected_amount_minor,actual_amount_minor,currency,cost_type,recurrence,expected_on,starts_on,billing_anchor_on,paid_on,ended_on,cancelled_on,status,owner_member_id,company_id,roadmap_item_id,source_decision_id,created_at,updated_at,cost_tasks(task_id)";

export class SupabaseCostRepository implements CostRepository {
  constructor(private readonly supabase: SupabaseClient) {}
  async findById(id: string) {
    const { data, error } = await this.supabase
      .from("costs")
      .select(SELECT)
      .eq("id", id)
      .maybeSingle();
    if (error) throw new Error("Não foi possível carregar o Cost.");
    return data ? map(data as unknown as Row) : null;
  }
  async create(values: ValidCostValues) {
    const { data, error } = await this.supabase.rpc("create_cost", {
      p_values: args(values),
      p_task_ids: values.taskIds,
    });
    if (error || typeof data !== "string") throw new Error("Não foi possível criar o Cost.");
    return this.require(data);
  }
  async update(cost: Cost, values: ValidCostValues) {
    const { error } = await this.supabase.rpc("update_cost", {
      p_cost_id: cost.id,
      p_values: args(values),
      p_task_ids: values.taskIds,
    });
    if (error) throw new Error("Não foi possível atualizar o Cost.");
    return this.require(cost.id);
  }
  activate(cost: Cost) {
    return this.transition(cost.id, "activate", null, null);
  }
  pay(cost: Cost, actualAmountMinor: number, paidOn: string) {
    return this.transition(cost.id, "pay", paidOn, actualAmountMinor);
  }
  end(cost: Cost, endedOn: string) {
    return this.transition(cost.id, "end", endedOn, null);
  }
  cancel(cost: Cost, cancelledOn: string) {
    return this.transition(cost.id, "cancel", cancelledOn, null);
  }
  private async transition(
    id: string,
    action: string,
    effectiveOn: string | null,
    actualAmountMinor: number | null,
  ) {
    const { error } = await this.supabase.rpc("transition_cost", {
      p_cost_id: id,
      p_action: action,
      p_effective_on: effectiveOn,
      p_actual_amount_minor: actualAmountMinor,
    });
    if (error) throw new Error("Não foi possível alterar o estado do Cost.");
    return this.require(id);
  }
  private async require(id: string) {
    const cost = await this.findById(id);
    if (!cost) throw new Error("O Cost não existe.");
    return cost;
  }
}
function args(v: ValidCostValues) {
  return {
    title: v.title,
    description: v.description,
    category: v.category,
    supplier: v.supplier,
    expected_amount_minor: v.expectedAmountMinor,
    currency: v.currency,
    cost_type: v.costType,
    recurrence: v.recurrence,
    expected_on: v.expectedOn,
    starts_on: v.startsOn,
    billing_anchor_on: v.billingAnchorOn,
    owner_member_id: v.ownerMemberId,
    company_id: v.companyId,
    roadmap_item_id: v.roadmapItemId,
    source_decision_id: v.sourceDecisionId,
  };
}
function map(r: Row): Cost {
  return {
    id: r.id,
    title: r.title,
    description: r.description,
    category: r.category,
    supplier: r.supplier,
    expectedAmountMinor: Number(r.expected_amount_minor),
    actualAmountMinor: r.actual_amount_minor === null ? null : Number(r.actual_amount_minor),
    currency: r.currency,
    costType: r.cost_type,
    recurrence: r.recurrence,
    expectedOn: r.expected_on,
    startsOn: r.starts_on,
    billingAnchorOn: r.billing_anchor_on,
    paidOn: r.paid_on,
    endedOn: r.ended_on,
    cancelledOn: r.cancelled_on,
    status: r.status,
    ownerMemberId: r.owner_member_id,
    companyId: r.company_id,
    roadmapItemId: r.roadmap_item_id,
    sourceDecisionId: r.source_decision_id,
    taskIds: r.cost_tasks.map((x) => x.task_id),
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}
