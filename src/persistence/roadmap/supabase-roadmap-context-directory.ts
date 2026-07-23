import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { RoadmapContextDirectory, RoadmapContextOption } from "@/application/roadmap/contracts";
import { COMPANY_STATUS_LABELS, type CompanyStatus } from "@/domain/companies/company";
import { DECISION_STATUS_LABELS, type DecisionStatus } from "@/domain/decisions/decision";
import type { ValidRoadmapItemValues } from "@/domain/roadmap/roadmap-item";
import { SPRINT_STATUS_LABELS, type SprintStatus } from "@/domain/sprints/sprint";
import { TASK_STATUS_LABELS, type TaskStatus } from "@/domain/tasks/task";

export class SupabaseRoadmapContextDirectory implements RoadmapContextDirectory {
  constructor(private readonly supabase: SupabaseClient) {}
  async getOptions() {
    const [companies, tasks, sprints, decisions] = await Promise.all([
      this.supabase.from("companies").select("id,name,status").order("name"),
      this.supabase.from("tasks").select("id,title,status").order("updated_at", { ascending: false }),
      this.supabase.from("sprints").select("id,name,status").order("starts_on", { ascending: false }),
      this.supabase.from("decisions").select("id,title,status").order("decided_on", { ascending: false }),
    ]);
    if (companies.error || tasks.error || sprints.error || decisions.error) throw new Error("Não foi possível carregar as relações do Roadmap.");
    const option = (row: { id: string; name?: string; title?: string }, meta: string): RoadmapContextOption => ({ id: row.id, label: row.name ?? row.title ?? row.id, meta });
    return {
      companies: (companies.data ?? []).map((row) => option(row, COMPANY_STATUS_LABELS[row.status as CompanyStatus])),
      tasks: (tasks.data ?? []).map((row) => option(row, TASK_STATUS_LABELS[row.status as TaskStatus])),
      sprints: (sprints.data ?? []).map((row) => option(row, SPRINT_STATUS_LABELS[row.status as SprintStatus])),
      decisions: (decisions.data ?? []).map((row) => option(row, DECISION_STATUS_LABELS[row.status as DecisionStatus])),
    };
  }
  async referencesExist(values: Pick<ValidRoadmapItemValues, "companyIds" | "taskIds" | "sprintIds" | "decisionIds">) {
    return Promise.all([
      this.count("companies", values.companyIds), this.count("tasks", values.taskIds), this.count("sprints", values.sprintIds), this.count("decisions", values.decisionIds),
    ]).then((checks) => checks.every(Boolean));
  }
  private async count(table: "companies" | "tasks" | "sprints" | "decisions", ids: readonly string[]) {
    if (!ids.length) return true;
    const { count, error } = await this.supabase.from(table).select("id", { count: "exact", head: true }).in("id", [...ids]);
    return !error && count === ids.length;
  }
}
