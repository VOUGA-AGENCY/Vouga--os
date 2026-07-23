import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { RoadmapItemRepository } from "@/application/roadmap/contracts";
import type { RoadmapItem, RoadmapHorizon, RoadmapKind, RoadmapLifecycleStatus, ValidRoadmapItemValues } from "@/domain/roadmap/roadmap-item";

type Row = { id: string; title: string; kind: RoadmapKind; description: string; evidence: string; horizon: RoadmapHorizon; lifecycle_status: RoadmapLifecycleStatus; owner_member_id: string | null; created_at: string; updated_at: string; roadmap_item_companies: { company_id: string }[]; roadmap_item_tasks: { task_id: string }[]; roadmap_item_sprints: { sprint_id: string }[]; roadmap_item_decisions: { decision_id: string }[] };
const SELECT = "id,title,kind,description,evidence,horizon,lifecycle_status,owner_member_id,created_at,updated_at,roadmap_item_companies(company_id),roadmap_item_tasks(task_id),roadmap_item_sprints(sprint_id),roadmap_item_decisions(decision_id)";

export class SupabaseRoadmapItemRepository implements RoadmapItemRepository {
  constructor(private readonly supabase: SupabaseClient) {}
  async findById(id: string) { const { data, error } = await this.supabase.from("roadmap_items").select(SELECT).eq("id", id).maybeSingle(); if (error) throw new Error("Não foi possível carregar o Roadmap Item."); return data ? map(data as unknown as Row) : null; }
  async create(values: ValidRoadmapItemValues) {
    const { data, error } = await this.supabase.rpc("create_roadmap_item", args(values));
    if (error || typeof data !== "string") throw new Error("Não foi possível criar o Roadmap Item.");
    return this.require(data);
  }
  async update(item: RoadmapItem, values: ValidRoadmapItemValues) {
    const horizonDecisionId = item.horizon === values.horizon ? null : values.decisionIds[0] ?? null;
    const { error } = await this.supabase.rpc("update_roadmap_item", { p_item_id: item.id, ...args(values), p_horizon_decision_id: horizonDecisionId });
    if (error) throw new Error("Não foi possível atualizar o Roadmap Item.");
    return this.require(item.id);
  }
  async finish(item: RoadmapItem, status: "completed" | "abandoned") {
    const { error } = await this.supabase.rpc("finish_roadmap_item", { p_item_id: item.id, p_status: status });
    if (error) throw new Error(status === "completed" ? "Não foi possível concluir o Roadmap Item." : "Não foi possível abandonar o Roadmap Item.");
    return this.require(item.id);
  }
  private async require(id: string) { const item = await this.findById(id); if (!item) throw new Error("O Roadmap Item não existe."); return item; }
}
function args(values: ValidRoadmapItemValues) { return { p_values: { title: values.title, kind: values.kind, description: values.description, evidence: values.evidence, horizon: values.horizon, owner_member_id: values.ownerMemberId }, p_company_ids: values.companyIds, p_task_ids: values.taskIds, p_sprint_ids: values.sprintIds, p_decision_ids: values.decisionIds }; }
function map(row: Row): RoadmapItem { return { id: row.id, title: row.title, kind: row.kind, description: row.description, evidence: row.evidence, horizon: row.horizon, lifecycleStatus: row.lifecycle_status, ownerMemberId: row.owner_member_id, companyIds: row.roadmap_item_companies.map((r) => r.company_id), taskIds: row.roadmap_item_tasks.map((r) => r.task_id), sprintIds: row.roadmap_item_sprints.map((r) => r.sprint_id), decisionIds: row.roadmap_item_decisions.map((r) => r.decision_id), createdAt: row.created_at, updatedAt: row.updated_at }; }
