import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { SprintRepository } from "@/application/sprints/contracts";
import type { Sprint, SprintClosureDisposition, SprintStatus, ValidSprintValues } from "@/domain/sprints/sprint";
import type { TaskStatus } from "@/domain/tasks/task";

type Row = { id: string; name: string; intended_result: string; status: SprintStatus; owner_member_id: string; starts_on: string; ends_on: string; material_risks: string | null; actual_result: string | null; learning: string | null; created_at: string; updated_at: string; sprint_tasks: Array<{ task_id: string; committed_at: string; closure_disposition: SprintClosureDisposition | null; task: { status: TaskStatus } | null }> };
const SELECT = "id,name,intended_result,status,owner_member_id,starts_on,ends_on,material_risks,actual_result,learning,created_at,updated_at,sprint_tasks(task_id,committed_at,closure_disposition,task:tasks!sprint_tasks_task_id_fkey(status))";

export class SupabaseSprintRepository implements SprintRepository {
  constructor(private readonly supabase: SupabaseClient) {}
  async findById(id: string) { const { data, error } = await this.supabase.from("sprints").select(SELECT).eq("id", id).maybeSingle(); if (error) throw new Error("Não foi possível carregar a Sprint."); return data ? map(data as unknown as Row) : null; }
  async create(values: ValidSprintValues) { const { data, error } = await this.supabase.rpc("create_sprint", { p_values: { name: values.name, intended_result: values.intendedResult, owner_member_id: values.ownerMemberId, starts_on: values.startsOn, ends_on: values.endsOn, material_risks: values.materialRisks }, p_task_ids: values.taskIds }); if (error || typeof data !== "string") throw new Error("Não foi possível criar a Sprint."); return this.require(data); }
  async activate(sprint: Sprint) { return this.run("activate_sprint", { p_sprint_id: sprint.id }, sprint.id, "Não foi possível ativar a Sprint."); }
  async cancel(sprint: Sprint) { return this.run("cancel_sprint", { p_sprint_id: sprint.id }, sprint.id, "Não foi possível cancelar a Sprint."); }
  async addTasks(sprint: Sprint, taskIds: readonly string[]) { return this.run("add_sprint_tasks", { p_sprint_id: sprint.id, p_task_ids: taskIds }, sprint.id, "Não foi possível alterar o compromisso."); }
  async removeTask(sprint: Sprint, taskId: string) { return this.run("remove_sprint_task", { p_sprint_id: sprint.id, p_task_id: taskId }, sprint.id, "Não foi possível remover a Task."); }
  async close(sprint: Sprint, actualResult: string, learning: string, dispositions: Readonly<Record<string, SprintClosureDisposition>>) { const values = Object.entries(dispositions).map(([task_id, disposition]) => ({ task_id, disposition })); return this.run("close_sprint", { p_sprint_id: sprint.id, p_actual_result: actualResult, p_learning: learning, p_dispositions: values }, sprint.id, "Não foi possível encerrar a Sprint."); }
  private async run(fn: string, args: Record<string, unknown>, id: string, message: string) { const { error } = await this.supabase.rpc(fn, args); if (error) throw new Error(message); return this.require(id); }
  private async require(id: string) { const sprint = await this.findById(id); if (!sprint) throw new Error("A Sprint não existe."); return sprint; }
}
function map(row: Row): Sprint { return { id: row.id, name: row.name, intendedResult: row.intended_result, status: row.status, ownerMemberId: row.owner_member_id, startsOn: row.starts_on, endsOn: row.ends_on, materialRisks: row.material_risks, actualResult: row.actual_result, learning: row.learning, tasks: row.sprint_tasks.map((item) => ({ taskId: item.task_id, taskStatus: item.task?.status ?? "cancelled", committedAt: item.committed_at, closureDisposition: item.closure_disposition })), createdAt: row.created_at, updatedAt: row.updated_at }; }
