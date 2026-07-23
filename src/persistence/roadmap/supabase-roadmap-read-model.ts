import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { DECISION_STATUS_LABELS, type DecisionStatus } from "@/domain/decisions/decision";
import type { RoadmapHorizon, RoadmapKind, RoadmapLifecycleStatus } from "@/domain/roadmap/roadmap-item";
import { SPRINT_STATUS_LABELS, type SprintStatus } from "@/domain/sprints/sprint";
import { TASK_STATUS_LABELS, type TaskStatus } from "@/domain/tasks/task";
import type { GlobalRoadmapProjection, RoadmapItemDetail, RoadmapItemSummary, RoadmapReadModel } from "@/projections/roadmap/roadmap-read-model";

type Row = { id: string; title: string; kind: RoadmapKind; description: string; evidence: string; horizon: RoadmapHorizon; lifecycle_status: RoadmapLifecycleStatus; owner_member_id: string | null; created_at: string; updated_at: string; owner: { display_name: string } | null; roadmap_item_companies: Array<{ company_id: string; company: { name: string } | null }>; roadmap_item_tasks: Array<{ task_id: string; task: { title: string; status: string } | null }>; roadmap_item_sprints: Array<{ sprint_id: string; sprint: { name: string; status: string } | null }>; roadmap_item_decisions: Array<{ decision_id: string; decision: { title: string; status: string } | null }> };
const SELECT = "id,title,kind,description,evidence,horizon,lifecycle_status,owner_member_id,created_at,updated_at,owner:members!roadmap_items_owner_member_id_fkey(display_name),roadmap_item_companies(company_id,company:companies!roadmap_item_companies_company_id_fkey(name)),roadmap_item_tasks(task_id,task:tasks!roadmap_item_tasks_task_id_fkey(title,status)),roadmap_item_sprints(sprint_id,sprint:sprints!roadmap_item_sprints_sprint_id_fkey(name,status)),roadmap_item_decisions(decision_id,decision:decisions!roadmap_item_decisions_decision_id_fkey(title,status))";

export class SupabaseRoadmapReadModel implements RoadmapReadModel {
  constructor(private readonly supabase: SupabaseClient) {}
  async getGlobal(): Promise<GlobalRoadmapProjection> {
    const { data, error } = await this.supabase.from("roadmap_items").select(SELECT).eq("lifecycle_status", "active").order("updated_at", { ascending: false });
    if (error) throw new Error("Não foi possível carregar o Roadmap.");
    const items = ((data ?? []) as unknown as Row[]).map(summary);
    return { now: items.filter((item) => item.horizon === "now"), next: items.filter((item) => item.horizon === "next"), later: items.filter((item) => item.horizon === "later") };
  }
  async listHistory() { const { data, error } = await this.supabase.from("roadmap_items").select(SELECT).in("lifecycle_status", ["completed", "abandoned"]).order("updated_at", { ascending: false }); if (error) throw new Error("Não foi possível carregar o histórico do Roadmap."); return ((data ?? []) as unknown as Row[]).map(summary); }
  async listByCompany(companyId: string) { return this.listRelated("roadmap_item_companies", "company_id", companyId); }
  async listByTask(taskId: string) { return this.listRelated("roadmap_item_tasks", "task_id", taskId); }
  async listBySprint(sprintId: string) { return this.listRelated("roadmap_item_sprints", "sprint_id", sprintId); }
  async listByDecision(decisionId: string) { return this.listRelated("roadmap_item_decisions", "decision_id", decisionId); }
  async findById(id: string) { const { data, error } = await this.supabase.from("roadmap_items").select(SELECT).eq("id", id).maybeSingle(); if (error) throw new Error("Não foi possível carregar o Roadmap Item."); return data ? detail(data as unknown as Row) : null; }
  private async listRelated(table: "roadmap_item_companies" | "roadmap_item_tasks" | "roadmap_item_sprints" | "roadmap_item_decisions", foreignKey: "company_id" | "task_id" | "sprint_id" | "decision_id", id: string) {
    const { data, error } = await this.supabase.from(table).select("roadmap_item_id").eq(foreignKey, id);
    if (error) throw new Error("Não foi possível carregar Roadmap Items relacionados.");
    const ids = (data ?? []).map((row) => row.roadmap_item_id);
    if (ids.length === 0) return [];
    const { data: items, error: itemsError } = await this.supabase.from("roadmap_items").select(SELECT).in("id", ids).order("updated_at", { ascending: false });
    if (itemsError) throw new Error("Não foi possível carregar Roadmap Items relacionados.");
    return ((items ?? []) as unknown as Row[]).map(summary);
  }
}
function summary(row: Row): RoadmapItemSummary { return { id: row.id, title: row.title, kind: row.kind, description: row.description, evidence: row.evidence, horizon: row.horizon, lifecycleStatus: row.lifecycle_status, ownerDisplayName: row.owner?.display_name ?? null, taskCount: row.roadmap_item_tasks.length, sprintCount: row.roadmap_item_sprints.length, decisionCount: row.roadmap_item_decisions.length, companyCount: row.roadmap_item_companies.length, updatedAt: row.updated_at }; }
function detail(row: Row): RoadmapItemDetail { const link = <T extends { id: string; value: { label: string; meta?: string } | null }>(values: T[]) => values.flatMap((entry) => entry.value ? [{ id: entry.id, label: entry.value.label, meta: entry.value.meta }] : []); return { ...summary(row), ownerMemberId: row.owner_member_id, companies: link(row.roadmap_item_companies.map((r) => ({ id: r.company_id, value: r.company ? { label: r.company.name } : null }))), tasks: link(row.roadmap_item_tasks.map((r) => ({ id: r.task_id, value: r.task ? { label: r.task.title, meta: TASK_STATUS_LABELS[r.task.status as TaskStatus] } : null }))), sprints: link(row.roadmap_item_sprints.map((r) => ({ id: r.sprint_id, value: r.sprint ? { label: r.sprint.name, meta: SPRINT_STATUS_LABELS[r.sprint.status as SprintStatus] } : null }))), decisions: link(row.roadmap_item_decisions.map((r) => ({ id: r.decision_id, value: r.decision ? { label: r.decision.title, meta: DECISION_STATUS_LABELS[r.decision.status as DecisionStatus] } : null }))), createdAt: row.created_at }; }
