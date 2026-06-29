import { sb } from "./sb";
import type { Task } from "./types";

function map(t: any): Task {
  return {
    id: t.id,
    title: t.title,
    status: t.status,
    priority: t.priority,
    notes: t.description ?? "",
    assignee: t.assignee_name ?? null,
    effort: t.effort ?? null,
    sprint_id: t.sprint_id ?? null,
    created_at: t.created_at,
  };
}

export const tasks = {
  async list(): Promise<Task[]> {
    const { data, error } = await sb.from("tasks").select("*").order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []).map(map);
  },
  async create(title: string, opts?: { priority?: string; sprint_id?: string | null; assignee?: string | null; status?: string }): Promise<void> {
    const payload: any = {
      title,
      priority: opts?.priority ?? "medium",
      status: opts?.status ?? "todo",
      sprint_id: opts?.sprint_id ?? null,
    };
    if (opts?.assignee) payload.assignee_name = opts.assignee;
    const { error } = await sb.from("tasks").insert(payload);
    if (error) throw error;
  },
  async update(
    id: string,
    patch: Partial<Pick<Task, "title" | "status" | "priority" | "notes" | "assignee" | "effort" | "sprint_id">>,
  ): Promise<void> {
    const p = patch as any;
    const payload: any = {};
    for (const k of ["title", "status", "priority", "effort", "sprint_id"]) if (k in p) payload[k] = p[k];
    if ("notes" in p) payload.description = p.notes;
    if ("assignee" in p) payload.assignee_name = p.assignee;
    const { error } = await sb.from("tasks").update(payload).eq("id", id);
    if (error) throw error;
  },
  async remove(id: string): Promise<void> {
    const { error } = await sb.from("tasks").delete().eq("id", id);
    if (error) throw error;
  },
};
