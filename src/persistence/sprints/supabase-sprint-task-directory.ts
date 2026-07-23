import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { SprintTaskDirectory, SprintTaskOption } from "@/application/sprints/contracts";
import type { TaskStatus } from "@/domain/tasks/task";
type Row = { id: string; title: string; status: TaskStatus; owner: { display_name: string } | null };
export class SupabaseSprintTaskDirectory implements SprintTaskDirectory {
  constructor(private readonly supabase: SupabaseClient) {}
  async listTasks(): Promise<SprintTaskOption[]> { const { data, error } = await this.supabase.from("tasks").select("id,title,status,owner:members!tasks_owner_member_id_fkey(display_name)").order("updated_at", { ascending: false }); if (error) throw new Error("Não foi possível carregar as Tasks."); return ((data ?? []) as unknown as Row[]).map((task) => ({ id: task.id, title: task.title, status: task.status, ownerDisplayName: task.owner?.display_name ?? "Owner indisponível" })); }
  async tasksExist(ids: readonly string[]) { if (!ids.length) return true; const unique = [...new Set(ids)]; const { count, error } = await this.supabase.from("tasks").select("id", { count: "exact", head: true }).in("id", unique); if (error) throw new Error("Não foi possível validar as Tasks."); return count === unique.length; }
}
