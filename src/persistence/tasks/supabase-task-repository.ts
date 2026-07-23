import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { TaskRepository } from "@/application/tasks/contracts";
import type {
  Task,
  TaskOrigin,
  TaskPurpose,
  TaskStatus,
  ValidTaskValues,
} from "@/domain/tasks/task";
type Row = {
  id: string;
  title: string;
  expected_result: string | null;
  purpose: TaskPurpose;
  status: TaskStatus;
  owner_member_id: string;
  due_at: string | null;
  blocked_reason: string | null;
  blocked_next_move: string | null;
  completion_note: string | null;
  completed_at: string | null;
  origin_type: "planning" | "meeting" | "google_event" | "decision" | "direct";
  origin_meeting_id: string | null;
  origin_decision_id: string | null;
  direct_origin_reason: string | null;
  origin_google_member_id: string | null;
  origin_google_calendar_id: string | null;
  origin_google_event_id: string | null;
  created_at: string;
  updated_at: string;
};
const SELECT =
  "id,title,expected_result,purpose,status,owner_member_id,due_at,blocked_reason,blocked_next_move,completion_note,completed_at,origin_type,origin_meeting_id,origin_decision_id,direct_origin_reason,origin_google_member_id,origin_google_calendar_id,origin_google_event_id,created_at,updated_at";
export class TaskPersistenceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TaskPersistenceError";
  }
}
export class SupabaseTaskRepository implements TaskRepository {
  constructor(private readonly supabase: SupabaseClient) {}
  async findById(id: string) {
    const { data, error } = await this.supabase
      .from("tasks")
      .select(SELECT)
      .eq("id", id)
      .maybeSingle();
    if (error) throw new TaskPersistenceError("Não foi possível carregar a Task.");
    if (!data) return null;
    const [c, m] = await Promise.all([
      this.supabase.from("task_companies").select("company_id").eq("task_id", id),
      this.supabase.from("task_meetings").select("meeting_id").eq("task_id", id),
    ]);
    if (c.error || m.error)
      throw new TaskPersistenceError("Não foi possível carregar o contexto da Task.");
    return map(
      data as Row,
      (c.data ?? []).map((x) => x.company_id),
      (m.data ?? []).map((x) => x.meeting_id),
    );
  }
  create(values: ValidTaskValues) {
    return this.save(null, values);
  }
  update(task: Task, values: ValidTaskValues) {
    return this.save(task.id, values);
  }
  async saveState(task: Task) {
    const { error } = await this.supabase
      .from("tasks")
      .update({
        status: task.status,
        blocked_reason: task.blockedReason,
        blocked_next_move: task.blockedNextMove,
        completion_note: task.completionNote,
        completed_at: task.completedAt,
      })
      .eq("id", task.id);
    if (error) throw new TaskPersistenceError("Não foi possível alterar o estado da Task.");
    const saved = await this.findById(task.id);
    if (!saved) throw new TaskPersistenceError("A Task não existe.");
    return saved;
  }
  async delete(id: string) {
    const { error } = await this.supabase.rpc("delete_task", { p_task_id: id });
    if (error)
      throw new TaskPersistenceError(
        error.code === "23503"
          ? "Esta Task tem contexto protegido e não pode ser eliminada."
          : "Não foi possível eliminar a Task.",
      );
  }
  private async save(id: string | null, v: ValidTaskValues) {
    const google = v.origin.type === "google_event" ? v.origin.googleEvent : null;
    const { data, error } = await this.supabase.rpc("save_task", {
      p_task_id: id,
      p_values: {
        title: v.title,
        purpose: v.purpose,
        owner_member_id: v.ownerMemberId,
        due_at: v.dueAt,
        origin_type: v.origin.type,
        origin_meeting_id: v.origin.meetingId,
        origin_decision_id: v.origin.decisionId,
        direct_origin_reason: v.origin.directReason,
        origin_google_member_id: google?.memberId ?? null,
        origin_google_calendar_id: google?.calendarId ?? null,
        origin_google_event_id: google?.eventId ?? null,
      },
      p_company_ids: v.companyIds,
      p_meeting_ids: v.meetingIds,
    });
    if (error || typeof data !== "string")
      throw new TaskPersistenceError("Não foi possível guardar a Task.");
    const saved = await this.findById(data);
    if (!saved) throw new TaskPersistenceError("A Task não existe.");
    return saved;
  }
}
function origin(r: Row): TaskOrigin {
  if (r.origin_type === "planning")
    return {
      type: "planning",
      meetingId: null,
      decisionId: null,
      directReason: null,
      googleEvent: null,
    };
  if (r.origin_type === "meeting")
    return {
      type: "meeting",
      meetingId: r.origin_meeting_id!,
      decisionId: null,
      directReason: null,
      googleEvent: null,
    };
  if (r.origin_type === "google_event")
    return {
      type: "google_event",
      meetingId: null,
      decisionId: null,
      directReason: null,
      googleEvent: {
        memberId: r.origin_google_member_id!,
        calendarId: r.origin_google_calendar_id!,
        eventId: r.origin_google_event_id!,
      },
    };
  if (r.origin_type === "decision")
    return {
      type: "decision",
      meetingId: null,
      decisionId: r.origin_decision_id!,
      directReason: null,
      googleEvent: null,
    };
  return {
    type: "direct",
    meetingId: null,
    decisionId: null,
    directReason: r.direct_origin_reason!,
    googleEvent: null,
  };
}
function map(r: Row, companyIds: string[], meetingIds: string[]): Task {
  return {
    id: r.id,
    title: r.title,
    expectedResult: r.expected_result,
    purpose: r.purpose,
    status: r.status,
    ownerMemberId: r.owner_member_id,
    dueAt: r.due_at,
    blockedReason: r.blocked_reason,
    blockedNextMove: r.blocked_next_move,
    completionNote: r.completion_note,
    completedAt: r.completed_at,
    origin: origin(r),
    companyIds,
    meetingIds,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}
