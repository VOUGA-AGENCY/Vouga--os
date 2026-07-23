import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import {
  effectiveMeetingStatus,
  type MeetingKind,
  type MeetingStatus,
  type VacationTone,
} from "@/domain/meetings/meeting";
import type {
  MeetingDetail,
  MeetingListItem,
  MeetingParticipantView,
  MeetingReadModel,
} from "@/projections/meetings/meeting-read-model";

type MeetingViewRow = {
  id: string;
  kind: MeetingKind;
  calendar_tone: VacationTone | null;
  title: string;
  purpose: string | null;
  intended_result: string | null;
  status: MeetingStatus;
  closer_member_id: string | null;
  starts_at: string;
  ends_at: string;
  agenda: string | null;
  notes: string | null;
  open_questions: string | null;
  conclusion: string | null;
  closed_at: string | null;
  created_at: string;
  updated_at: string;
  closer: { display_name: string; email: string } | null;
  meeting_participants: Array<{
    member_id: string | null;
    contact_id: string | null;
    external_name: string | null;
    member: { display_name: string; email: string } | null;
  }>;
  meeting_companies: Array<{
    company_id: string;
    company: { name: string } | null;
  }>;
  task_meetings: Array<{ task_id: string; task: { title: string } | null }>;
};

const MEETING_VIEW_SELECT =
  "id,kind,calendar_tone,title,purpose,intended_result,status,closer_member_id,starts_at,ends_at,agenda,notes,open_questions,conclusion,closed_at,created_at,updated_at,closer:members!meetings_closer_member_id_fkey(display_name,email),meeting_participants(member_id,contact_id,external_name,member:members!meeting_participants_member_id_fkey(display_name,email)),meeting_companies(company_id,company:companies!meeting_companies_company_id_fkey(name)),task_meetings(task_id,task:tasks!task_meetings_task_id_fkey(title))";

export class SupabaseMeetingReadModel implements MeetingReadModel {
  constructor(private readonly supabase: SupabaseClient) {}

  async list(now: string): Promise<MeetingListItem[]> {
    const { data, error } = await this.supabase
      .from("meetings")
      .select(MEETING_VIEW_SELECT)
      .order("starts_at", { ascending: true });
    if (error) throw new Error("Não foi possível carregar as Meetings.");
    return ((data ?? []) as unknown as MeetingViewRow[]).map((row) => toListItem(row, now));
  }

  async listByCompany(companyId: string, now: string): Promise<MeetingListItem[]> {
    const { data, error } = await this.supabase
      .from("meeting_companies")
      .select("meeting_id")
      .eq("company_id", companyId);
    if (error) throw new Error("Não foi possível carregar Meetings relacionadas.");
    const ids = (data ?? []).map((row) => row.meeting_id);
    if (ids.length === 0) return [];
    const { data: meetings, error: meetingsError } = await this.supabase
      .from("meetings")
      .select(MEETING_VIEW_SELECT)
      .in("id", ids)
      .order("starts_at", { ascending: false });
    if (meetingsError) throw new Error("Não foi possível carregar Meetings relacionadas.");
    return ((meetings ?? []) as unknown as MeetingViewRow[]).map((row) => toListItem(row, now));
  }

  async findById(id: string, now: string): Promise<MeetingDetail | null> {
    const { data, error } = await this.supabase
      .from("meetings")
      .select(MEETING_VIEW_SELECT)
      .eq("id", id)
      .maybeSingle();
    if (error) throw new Error("Não foi possível carregar a Meeting.");
    if (!data) return null;
    const row = data as unknown as MeetingViewRow;
    const participants = row.meeting_participants.map(toParticipantView);
    return {
      ...toListItem(row, now),
      intendedResult: row.intended_result,
      closerMemberId: row.closer_member_id,
      agenda: row.agenda,
      notes: row.notes,
      openQuestions: row.open_questions,
      conclusion: row.conclusion,
      closedAt: row.closed_at,
      participants,
      participantMemberIds: row.meeting_participants.flatMap((item) =>
        item.member_id ? [item.member_id] : [],
      ),
      participantContactIds: row.meeting_participants.flatMap((item) =>
        item.contact_id ? [item.contact_id] : [],
      ),
      externalParticipantNames: row.meeting_participants.flatMap((item) =>
        item.external_name ? [item.external_name] : [],
      ),
      companyIds: row.meeting_companies.map((item) => item.company_id),
      taskIds: row.task_meetings.map((item) => item.task_id),
      tasks: row.task_meetings.flatMap((item) =>
        item.task ? [{ id: item.task_id, title: item.task.title }] : [],
      ),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}

function toListItem(row: MeetingViewRow, now: string): MeetingListItem {
  return {
    id: row.id,
    kind: row.kind,
    calendarTone: row.calendar_tone,
    title: row.title,
    purpose: row.purpose,
    status: effectiveMeetingStatus(
      { kind: row.kind, status: row.status, endsAt: row.ends_at },
      now,
    ),
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    closerMemberId: row.closer_member_id,
    closerDisplayName: row.closer?.display_name ?? null,
    participantMembers: row.meeting_participants.flatMap((item) =>
      item.member_id
        ? [
            {
              memberId: item.member_id,
              displayName: item.member?.display_name ?? "Membro indisponível",
            },
          ]
        : [],
    ),
    companyNames: row.meeting_companies.flatMap((item) =>
      item.company?.name ? [item.company.name] : [],
    ),
    updatedAt: row.updated_at,
  };
}

function toParticipantView(
  participant: MeetingViewRow["meeting_participants"][number],
): MeetingParticipantView {
  if (participant.member_id) {
    return {
      kind: "internal",
      displayName: participant.member?.display_name ?? "Membro indisponível",
      email: participant.member?.email ?? null,
      contactId: null,
    };
  }
  return {
    kind: "external",
    displayName: participant.external_name ?? "Participante externo",
    email: null,
    contactId: participant.contact_id,
  };
}
