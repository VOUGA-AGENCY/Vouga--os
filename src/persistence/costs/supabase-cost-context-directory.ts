import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { CostContextDirectory, CostContextOption } from "@/application/costs/contracts";
import type { ValidCostValues } from "@/domain/costs/cost";

export class SupabaseCostContextDirectory implements CostContextDirectory {
  constructor(private readonly supabase: SupabaseClient) {}
  async getOptions() {
    const [companies, roadmapItems, decisions, tasks] = await Promise.all([
      this.supabase.from("companies").select("id,name,status").order("name"),
      this.supabase
        .from("roadmap_items")
        .select("id,title,horizon")
        .eq("lifecycle_status", "active")
        .order("updated_at", { ascending: false }),
      this.supabase
        .from("decisions")
        .select("id,title,status")
        .order("decided_on", { ascending: false }),
      this.supabase
        .from("tasks")
        .select("id,title,status")
        .not("status", "in", "(completed,cancelled)")
        .order("updated_at", { ascending: false }),
    ]);
    if (companies.error || roadmapItems.error || decisions.error || tasks.error)
      throw new Error("Não foi possível carregar as relações de Costs.");
    const option = (id: string, label: string, meta: string): CostContextOption => ({
      id,
      label,
      meta,
    });
    return {
      companies: (companies.data ?? []).map((x) => option(x.id, x.name, x.status)),
      roadmapItems: (roadmapItems.data ?? []).map((x) => option(x.id, x.title, x.horizon)),
      decisions: (decisions.data ?? []).map((x) => option(x.id, x.title, x.status)),
      tasks: (tasks.data ?? []).map((x) => option(x.id, x.title, x.status)),
    };
  }
  async referencesExist(
    v: Pick<ValidCostValues, "companyId" | "roadmapItemId" | "sourceDecisionId" | "taskIds">,
  ) {
    const checks = await Promise.all([
      this.exists("companies", v.companyId ? [v.companyId] : []),
      this.exists("roadmap_items", v.roadmapItemId ? [v.roadmapItemId] : []),
      this.exists("decisions", v.sourceDecisionId ? [v.sourceDecisionId] : []),
      this.exists("tasks", v.taskIds),
    ]);
    return checks.every(Boolean);
  }
  private async exists(
    table: "companies" | "roadmap_items" | "decisions" | "tasks",
    ids: readonly string[],
  ) {
    if (!ids.length) return true;
    const { count, error } = await this.supabase
      .from(table)
      .select("id", { count: "exact", head: true })
      .in("id", [...ids]);
    return !error && count === ids.length;
  }
}
