import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { TaskOrigin, TaskPurpose, TaskStatus } from "@/domain/tasks/task";
import type { TaskDetail, TaskListItem, TaskReadModel } from "@/projections/tasks/task-read-model";
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
  owner: { display_name: string } | null;
  origin_meeting: { title: string } | null;
  origin_decision: { title: string } | null;
  task_companies: Array<{ company_id: string; company: { name: string } | null }>;
  task_meetings: Array<{ meeting_id: string; meeting: { title: string } | null }>;
  decision_tasks: Array<{ decision_id: string; decision: { title: string } | null }>;
};
const SELECT =
  "id,title,expected_result,purpose,status,owner_member_id,due_at,blocked_reason,blocked_next_move,completion_note,completed_at,origin_type,origin_meeting_id,origin_decision_id,direct_origin_reason,origin_google_member_id,origin_google_calendar_id,origin_google_event_id,created_at,updated_at,owner:members!tasks_owner_member_id_fkey(display_name),origin_meeting:meetings!tasks_origin_meeting_id_fkey(title),origin_decision:decisions!tasks_origin_decision_id_fkey(title),task_companies(company_id,company:companies!task_companies_company_id_fkey(name)),task_meetings(meeting_id,meeting:meetings!task_meetings_meeting_id_fkey(title)),decision_tasks(decision_id,decision:decisions!decision_tasks_decision_id_fkey(title))";
export class SupabaseTaskReadModel implements TaskReadModel {
  constructor(private readonly supabase: SupabaseClient) {}
  async list() {
    return this.fetch();
  }
  async listByCompany(companyId: string) {
    const { data, error } = await this.supabase
      .from("task_companies")
      .select("task_id")
      .eq("company_id", companyId);
    if (error) throw new Error("Não foi possível carregar Tasks.");
    return this.fetch((data ?? []).map((x) => x.task_id));
  }
  async listByMeeting(meetingId: string) {
    const { data, error } = await this.supabase
      .from("task_meetings")
      .select("task_id")
      .eq("meeting_id", meetingId);
    if (error) throw new Error("Não foi possível carregar Tasks.");
    return this.fetch((data ?? []).map((x) => x.task_id));
  }
  async findById(id: string) {
    const { data, error } = await this.supabase
      .from("tasks")
      .select(SELECT)
      .eq("id", id)
      .maybeSingle();
    if (error) throw new Error("Não foi possível carregar a Task.");
    return data ? detail(data as unknown as Row) : null;
  }
  private async fetch(ids?: string[]): Promise<TaskListItem[]> {
    if (ids && ids.length === 0) return [];
    let query = this.supabase
      .from("tasks")
      .select(SELECT)
      .order("updated_at", { ascending: false });
    if (ids) query = query.in("id", ids);
    const { data, error } = await query;
    if (error) throw new Error("Não foi possível carregar Tasks.");
    return ((data ?? []) as unknown as Row[]).map(list);
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
function list(r: Row): TaskListItem {
  const label =
    r.origin_type === "planning"
      ? "Planeamento"
      : r.origin_type === "meeting"
        ? `Meeting/Event · ${r.origin_meeting?.title ?? "indisponível"}`
        : r.origin_type === "google_event"
          ? "Google Event"
          : r.origin_type === "decision"
            ? `Decision · ${r.origin_decision?.title ?? "indisponível"}`
            : "Planeamento (legado)";
  return {
    id: r.id,
    title: r.title,
    expectedResult: r.expected_result,
    purpose: r.purpose,
    status: r.status,
    ownerMemberId: r.owner_member_id,
    ownerDisplayName: r.owner?.display_name ?? "Owner indisponível",
    dueAt: r.due_at,
    blockedReason: r.blocked_reason,
    blockedNextMove: r.blocked_next_move,
    originLabel: label,
    originMeetingId: r.origin_meeting_id,
    originDecisionId: r.origin_decision_id,
    companyIds: r.task_companies.map((x) => x.company_id),
    companyNames: r.task_companies.flatMap((x) => (x.company?.name ? [x.company.name] : [])),
    meetingIds: r.task_meetings.map((x) => x.meeting_id),
    meetingTitles: r.task_meetings.flatMap((x) => (x.meeting?.title ? [x.meeting.title] : [])),
    decisionIds: r.decision_tasks.map((x) => x.decision_id),
    decisionTitles: r.decision_tasks.flatMap((x) => (x.decision?.title ? [x.decision.title] : [])),
    updatedAt: r.updated_at,
  };
}
function detail(r: Row): TaskDetail {
  return {
    ...list(r),
    completionNote: r.completion_note,
    completedAt: r.completed_at,
    origin: origin(r),
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}
