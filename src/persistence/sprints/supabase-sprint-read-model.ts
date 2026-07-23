import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { SprintClosureDisposition, SprintStatus } from "@/domain/sprints/sprint";
import type { TaskStatus } from "@/domain/tasks/task";
import type { SprintDetail, SprintListItem, SprintReadModel } from "@/projections/sprints/sprint-read-model";

type Row = { id: string; name: string; intended_result: string; status: SprintStatus; owner_member_id: string; starts_on: string; ends_on: string; material_risks: string | null; actual_result: string | null; learning: string | null; created_at: string; updated_at: string; owner: { display_name: string } | null; sprint_tasks: Array<{ task_id: string; committed_at: string; closure_disposition: SprintClosureDisposition | null; task: { title: string; expected_result: string; status: TaskStatus; due_at: string | null; blocked_reason: string | null; blocked_next_move: string | null; owner: { display_name: string } | null } | null }> };
const SELECT = "id,name,intended_result,status,owner_member_id,starts_on,ends_on,material_risks,actual_result,learning,created_at,updated_at,owner:members!sprints_owner_member_id_fkey(display_name),sprint_tasks(task_id,committed_at,closure_disposition,task:tasks!sprint_tasks_task_id_fkey(title,expected_result,status,due_at,blocked_reason,blocked_next_move,owner:members!tasks_owner_member_id_fkey(display_name)))";

export class SupabaseSprintReadModel implements SprintReadModel {
  constructor(private readonly supabase: SupabaseClient) {}
  async list() { const { data, error } = await this.supabase.from("sprints").select(SELECT).order("starts_on", { ascending: false }); if (error) throw new Error("Não foi possível carregar as Sprints."); return ((data ?? []) as unknown as Row[]).map(list); }
  async listByTaskIds(taskIds: readonly string[]) {
    if (taskIds.length === 0) return [];
    const { data, error } = await this.supabase.from("sprint_tasks").select("sprint_id").in("task_id", [...taskIds]);
    if (error) throw new Error("Não foi possível carregar Sprints relacionadas.");
    const ids = [...new Set((data ?? []).map((row) => row.sprint_id))];
    if (ids.length === 0) return [];
    const { data: sprints, error: sprintsError } = await this.supabase.from("sprints").select(SELECT).in("id", ids).order("starts_on", { ascending: false });
    if (sprintsError) throw new Error("Não foi possível carregar Sprints relacionadas.");
    return ((sprints ?? []) as unknown as Row[]).map(list);
  }
  async findById(id: string) { const { data, error } = await this.supabase.from("sprints").select(SELECT).eq("id", id).maybeSingle(); if (error) throw new Error("Não foi possível carregar a Sprint."); return data ? detail(data as unknown as Row) : null; }
}
function list(row: Row): SprintListItem { const tasks = row.sprint_tasks.flatMap((item) => item.task ? [item.task] : []); return { id: row.id, name: row.name, intendedResult: row.intended_result, status: row.status, ownerMemberId: row.owner_member_id, ownerDisplayName: row.owner?.display_name ?? "Owner indisponível", startsOn: row.starts_on, endsOn: row.ends_on, taskCount: tasks.length, completedTaskCount: tasks.filter((task) => task.status === "completed").length, blockedTaskCount: tasks.filter((task) => task.status === "blocked").length }; }
function detail(row: Row): SprintDetail { return { ...list(row), materialRisks: row.material_risks, actualResult: row.actual_result, learning: row.learning, tasks: row.sprint_tasks.flatMap((item) => item.task ? [{ taskId: item.task_id, title: item.task.title, expectedResult: item.task.expected_result, status: item.task.status, ownerDisplayName: item.task.owner?.display_name ?? "Owner indisponível", dueAt: item.task.due_at, blockedReason: item.task.blocked_reason, blockedNextMove: item.task.blocked_next_move, committedAt: item.committed_at, closureDisposition: item.closure_disposition }] : []), createdAt: row.created_at, updatedAt: row.updated_at }; }
