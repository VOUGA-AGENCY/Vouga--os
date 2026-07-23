import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { DecisionRepository } from "@/application/decisions/contracts";
import type {
  Decision,
  DecisionReviewEffect,
  DecisionRevision,
  DecisionStatus,
  ValidDecisionValues,
} from "@/domain/decisions/decision";

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
};

const SELECT =
  "id,title,choice,reason,alternatives,impact,status,authority_member_id,decided_on,origin_meeting_id,created_at,updated_at";

export class SupabaseDecisionRepository implements DecisionRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async findById(id: string): Promise<Decision | null> {
    const { data, error } = await this.supabase
      .from("decisions")
      .select(SELECT)
      .eq("id", id)
      .maybeSingle();
    if (error) throw new Error("Não foi possível carregar a Decision.");
    if (!data) return null;

    const [companies, meetings, tasks, revision] = await Promise.all([
      this.supabase.from("decision_companies").select("company_id").eq("decision_id", id),
      this.supabase.from("decision_meetings").select("meeting_id").eq("decision_id", id),
      this.supabase.from("decision_tasks").select("task_id").eq("decision_id", id),
      this.supabase
        .from("decision_revisions")
        .select("previous_decision_id,effect")
        .eq("decision_id", id)
        .maybeSingle(),
    ]);
    if (companies.error || meetings.error || tasks.error || revision.error) {
      throw new Error("Não foi possível carregar as relações da Decision.");
    }

    return mapDecision(
      data as DecisionRow,
      (companies.data ?? []).map((row) => row.company_id),
      (meetings.data ?? []).map((row) => row.meeting_id),
      (tasks.data ?? []).map((row) => row.task_id),
      revision.data
        ? {
            previousDecisionId: revision.data.previous_decision_id,
            effect: revision.data.effect as DecisionReviewEffect,
          }
        : null,
    );
  }

  async create(
    id: string,
    values: ValidDecisionValues,
    revision: DecisionRevision | null,
  ): Promise<Decision> {
    const { data, error } = await this.supabase.rpc("create_decision", {
      p_decision_id: id,
      p_values: {
        title: values.title,
        choice: values.choice,
        reason: values.reason,
        alternatives: values.alternatives,
        impact: values.impact,
        authority_member_id: values.authorityMemberId,
        decided_on: values.decidedOn,
        origin_meeting_id: values.originMeetingId,
      },
      p_company_ids: values.companyIds,
      p_meeting_ids: values.meetingIds,
      p_task_ids: values.taskIds,
      p_previous_decision_id: revision?.previousDecisionId ?? null,
      p_review_effect: revision?.effect ?? null,
    });
    if (error || data !== id) throw new Error("Não foi possível guardar a Decision.");
    const saved = await this.findById(id);
    if (!saved) throw new Error("A Decision não existe.");
    return saved;
  }
}

function mapDecision(
  row: DecisionRow,
  companyIds: string[],
  meetingIds: string[],
  taskIds: string[],
  revision: DecisionRevision | null,
): Decision {
  return {
    id: row.id,
    title: row.title,
    choice: row.choice,
    reason: row.reason,
    alternatives: row.alternatives,
    impact: row.impact,
    status: row.status,
    authorityMemberId: row.authority_member_id,
    decidedOn: row.decided_on,
    originMeetingId: row.origin_meeting_id,
    companyIds,
    meetingIds,
    taskIds,
    revision,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
