import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  DecisionReviewEffect,
  DecisionStatus,
} from "@/domain/decisions/decision";
import type {
  DecisionContextLink,
  DecisionDetail,
  DecisionListItem,
  DecisionReadModel,
  RelatedDecision,
} from "@/projections/decisions/decision-read-model";

type DecisionRow = {
  id: string;
  title: string;
  choice: string;
  reason: string;
  alternatives: string | null;
  impact: string;
  status: DecisionStatus;
  authority_member_id: string;
  decided_on: string;
  origin_meeting_id: string | null;
  created_at: string;
  updated_at: string;
  authority: { display_name: string } | null;
  origin_meeting: { title: string } | null;
};

type RevisionRow = {
  previous_decision_id: string;
  effect: DecisionReviewEffect;
  previous: { id: string; title: string; status: DecisionStatus } | null;
};

type FollowingRevisionRow = {
  effect: DecisionReviewEffect;
  decision: { id: string; title: string; status: DecisionStatus } | null;
};

const SELECT =
  "id,title,choice,reason,alternatives,impact,status,authority_member_id,decided_on,origin_meeting_id,created_at,updated_at,authority:members!decisions_authority_member_id_fkey(display_name),origin_meeting:meetings!decisions_origin_meeting_id_fkey(title)";

export class SupabaseDecisionReadModel implements DecisionReadModel {
  constructor(private readonly supabase: SupabaseClient) {}

  list() {
    return this.fetch();
  }

  async listByCompany(companyId: string) {
    return this.listRelated("decision_companies", "company_id", companyId);
  }

  async listByMeeting(meetingId: string) {
    return this.listRelated("decision_meetings", "meeting_id", meetingId);
  }

  async listByTask(taskId: string) {
    return this.listRelated("decision_tasks", "task_id", taskId);
  }

  async findById(id: string): Promise<DecisionDetail | null> {
    const { data, error } = await this.supabase
      .from("decisions")
      .select(SELECT)
      .eq("id", id)
      .maybeSingle();
    if (error) throw new Error("Não foi possível carregar a Decision.");
    if (!data) return null;

    const [companies, meetings, tasks, previous, revisions] = await Promise.all([
      this.supabase
        .from("decision_companies")
        .select("company_id,company:companies!decision_companies_company_id_fkey(name)")
        .eq("decision_id", id),
      this.supabase
        .from("decision_meetings")
        .select("meeting_id,meeting:meetings!decision_meetings_meeting_id_fkey(title)")
        .eq("decision_id", id),
      this.supabase
        .from("decision_tasks")
        .select("task_id,task:tasks!decision_tasks_task_id_fkey(title)")
        .eq("decision_id", id),
      this.supabase
        .from("decision_revisions")
        .select(
          "previous_decision_id,effect,previous:decisions!decision_revisions_previous_decision_id_fkey(id,title,status)",
        )
        .eq("decision_id", id)
        .maybeSingle(),
      this.supabase
        .from("decision_revisions")
        .select(
          "effect,decision:decisions!decision_revisions_decision_id_fkey(id,title,status)",
        )
        .eq("previous_decision_id", id),
    ]);
    if (
      companies.error ||
      meetings.error ||
      tasks.error ||
      previous.error ||
      revisions.error
    ) {
      throw new Error("Não foi possível carregar o contexto histórico da Decision.");
    }

    const row = data as unknown as DecisionRow;
    const previousRow = previous.data as unknown as RevisionRow | null;
    return {
      ...toListItem(row),
      reason: row.reason,
      alternatives: row.alternatives,
      impact: row.impact,
      authorityMemberId: row.authority_member_id,
      originMeetingId: row.origin_meeting_id,
      companies: (companies.data ?? []).flatMap((item) =>
        link(item.company_id, relationLabel(item.company, "name")),
      ),
      meetings: (meetings.data ?? []).flatMap((item) =>
        link(item.meeting_id, relationLabel(item.meeting, "title")),
      ),
      tasks: (tasks.data ?? []).flatMap((item) =>
        link(item.task_id, relationLabel(item.task, "title")),
      ),
      previous: previousRow?.previous
        ? related(previousRow.previous, previousRow.effect)
        : null,
      revisions: ((revisions.data ?? []) as unknown as FollowingRevisionRow[]).flatMap(
        (revision) => (revision.decision ? [related(revision.decision, revision.effect)] : []),
      ),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private async listRelated(
    table: "decision_companies" | "decision_meetings" | "decision_tasks",
    foreignKey: "company_id" | "meeting_id" | "task_id",
    id: string,
  ) {
    const { data, error } = await this.supabase
      .from(table)
      .select("decision_id")
      .eq(foreignKey, id);
    if (error) throw new Error("Não foi possível carregar Decisions relacionadas.");
    return this.fetch((data ?? []).map((row) => row.decision_id));
  }

  private async fetch(ids?: string[]): Promise<DecisionListItem[]> {
    if (ids && ids.length === 0) return [];
    let query = this.supabase
      .from("decisions")
      .select(SELECT)
      .order("decided_on", { ascending: false })
      .order("created_at", { ascending: false });
    if (ids) query = query.in("id", ids);
    const { data, error } = await query;
    if (error) throw new Error("Não foi possível carregar Decisions.");
    return ((data ?? []) as unknown as DecisionRow[]).map(toListItem);
  }
}

function toListItem(row: DecisionRow): DecisionListItem {
  return {
    id: row.id,
    title: row.title,
    choice: row.choice,
    status: row.status,
    authorityDisplayName: row.authority?.display_name ?? "Autoridade indisponível",
    decidedOn: row.decided_on,
    originMeetingId: row.origin_meeting_id,
    originMeetingTitle: row.origin_meeting?.title ?? null,
    updatedAt: row.updated_at,
  };
}

function relationLabel(
  relation: Record<string, unknown> | Record<string, unknown>[] | null,
  field: "name" | "title",
): string | null {
  const value = Array.isArray(relation) ? relation[0] : relation;
  return value && typeof value[field] === "string" ? value[field] : null;
}

function link(id: string, label: string | null): DecisionContextLink[] {
  return label ? [{ id, label }] : [];
}

function related(
  decision: { id: string; title: string; status: DecisionStatus },
  effect: DecisionReviewEffect,
): RelatedDecision {
  return { ...decision, effect };
}
