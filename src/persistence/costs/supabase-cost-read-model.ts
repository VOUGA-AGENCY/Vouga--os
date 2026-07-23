import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { CashBalanceSnapshot } from "@/application/costs/contracts";
import type { CostCategory, CostRecurrence, CostStatus, CostType } from "@/domain/costs/cost";
import type { CostDetail, CostListItem, CostReadModel } from "@/projections/costs/cost-read-model";

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
  created_at: string;
  updated_at: string;
  owner: { display_name: string } | null;
  company: { id: string; name: string } | null;
  roadmap_item: { id: string; title: string; horizon: string } | null;
  source_decision: { id: string; title: string; status: string } | null;
  cost_tasks: Array<{ task_id: string; task: { title: string; status: string } | null }>;
};
const SELECT =
  "id,title,description,category,supplier,expected_amount_minor,actual_amount_minor,currency,cost_type,recurrence,expected_on,starts_on,billing_anchor_on,paid_on,ended_on,cancelled_on,status,owner_member_id,created_at,updated_at,owner:members!costs_owner_member_id_fkey(display_name),company:companies!costs_company_id_fkey(id,name),roadmap_item:roadmap_items!costs_roadmap_item_id_fkey(id,title,horizon),source_decision:decisions!costs_source_decision_id_fkey(id,title,status),cost_tasks(task_id,task:tasks!cost_tasks_task_id_fkey(title,status))";

export class SupabaseCostReadModel implements CostReadModel {
  constructor(private readonly supabase: SupabaseClient) {}
  async list() {
    const { data, error } = await this.supabase
      .from("costs")
      .select(SELECT)
      .order("updated_at", { ascending: false });
    if (error) throw new Error("Não foi possível carregar os Costs.");
    return ((data ?? []) as unknown as Row[]).map(summary);
  }
  async findById(id: string) {
    const { data, error } = await this.supabase
      .from("costs")
      .select(SELECT)
      .eq("id", id)
      .maybeSingle();
    if (error) throw new Error("Não foi possível carregar o Cost.");
    return data ? detail(data as unknown as Row) : null;
  }
  listByCompany(id: string) {
    return this.listRelated("company_id", id);
  }
  listByRoadmapItem(id: string) {
    return this.listRelated("roadmap_item_id", id);
  }
  listByDecision(id: string) {
    return this.listRelated("source_decision_id", id);
  }
  async listByTask(id: string) {
    return this.listByTaskIds([id]);
  }
  async listByTaskIds(taskIds: readonly string[]) {
    if (!taskIds.length) return [];
    const { data, error } = await this.supabase
      .from("cost_tasks")
      .select("cost_id")
      .in("task_id", [...taskIds]);
    if (error) throw new Error("Não foi possível carregar Costs relacionados.");
    const ids = [...new Set((data ?? []).map((x) => x.cost_id))];
    if (!ids.length) return [];
    const { data: costs, error: costsError } = await this.supabase
      .from("costs")
      .select(SELECT)
      .in("id", ids)
      .order("updated_at", { ascending: false });
    if (costsError) throw new Error("Não foi possível carregar Costs relacionados.");
    return ((costs ?? []) as unknown as Row[]).map(summary);
  }
  async listCashBalances(): Promise<CashBalanceSnapshot[]> {
    const { data, error } = await this.supabase
      .from("cash_balance_snapshots")
      .select(
        "id,balance_minor,currency,confirmed_at,confirmed_by_member_id,description,created_at,member:members!cash_balance_snapshots_confirmed_by_member_id_fkey(display_name)",
      )
      .order("confirmed_at", { ascending: false });
    if (error) throw new Error("Não foi possível carregar os saldos confirmados.");
    return (data ?? []).map((row) => {
      const member = row.member as unknown as { display_name: string } | null;
      return {
        id: row.id,
        balanceMinor: Number(row.balance_minor),
        currency: row.currency,
        confirmedAt: row.confirmed_at,
        confirmedByMemberId: row.confirmed_by_member_id,
        confirmedByDisplayName: member?.display_name ?? "Membro",
        description: row.description,
        createdAt: row.created_at,
      };
    });
  }
  private async listRelated(
    column: "company_id" | "roadmap_item_id" | "source_decision_id",
    id: string,
  ) {
    const { data, error } = await this.supabase
      .from("costs")
      .select(SELECT)
      .eq(column, id)
      .order("updated_at", { ascending: false });
    if (error) throw new Error("Não foi possível carregar Costs relacionados.");
    return ((data ?? []) as unknown as Row[]).map(summary);
  }
}
function summary(r: Row): CostListItem {
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
    ownerDisplayName: r.owner?.display_name ?? null,
    companyName: r.company?.name ?? null,
    roadmapItemTitle: r.roadmap_item?.title ?? null,
    sourceDecisionTitle: r.source_decision?.title ?? null,
    taskCount: r.cost_tasks.length,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}
function detail(r: Row): CostDetail {
  return {
    ...summary(r),
    company: r.company ? { id: r.company.id, label: r.company.name } : null,
    roadmapItem: r.roadmap_item
      ? { id: r.roadmap_item.id, label: r.roadmap_item.title, meta: r.roadmap_item.horizon }
      : null,
    sourceDecision: r.source_decision
      ? { id: r.source_decision.id, label: r.source_decision.title, meta: r.source_decision.status }
      : null,
    tasks: r.cost_tasks.flatMap((x) =>
      x.task ? [{ id: x.task_id, label: x.task.title, meta: x.task.status }] : [],
    ),
  };
}
