import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { MeetingRepository } from "@/application/meetings/contracts";
import type {
  Meeting,
  MeetingKind,
  MeetingParticipant,
  MeetingStatus,
  VacationTone,
  ValidMeetingValues,
} from "@/domain/meetings/meeting";

type MeetingRow = {
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
};

type ParticipantRow = {
  member_id: string | null;
  contact_id: string | null;
  external_name: string | null;
};
type CompanyRow = { company_id: string };
type TaskRow = { task_id: string };

const MEETING_SELECT =
  "id,kind,calendar_tone,title,purpose,intended_result,status,closer_member_id,starts_at,ends_at,agenda,notes,open_questions,conclusion,closed_at,created_at,updated_at";

export class MeetingPersistenceError extends Error {
  constructor(message = "Não foi possível aceder às Meetings.") {
    super(message);
    this.name = "MeetingPersistenceError";
  }
}

function meetingPersistenceMessage(error: { code?: string; message?: string }): string {
  const schemaMismatch =
    ["42703", "PGRST202", "PGRST204"].includes(error.code ?? "") ||
    /calendar_tone|save_meeting/i.test(error.message ?? "");
  return schemaMismatch
    ? "O Calendar ainda não está atualizado no Supabase. Aplica a migration de Vacation antes de guardar."
    : "Não foi possível guardar a Meeting.";
}

export class SupabaseMeetingRepository implements MeetingRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async findById(id: string): Promise<Meeting | null> {
    const { data, error } = await this.supabase
      .from("meetings")
      .select(MEETING_SELECT)
      .eq("id", id)
      .maybeSingle();
    if (error) throw new MeetingPersistenceError(meetingPersistenceMessage(error));
    if (!data) return null;

    const [participantsResult, companiesResult, tasksResult] = await Promise.all([
      this.supabase
        .from("meeting_participants")
        .select("member_id,contact_id,external_name")
        .eq("meeting_id", id),
      this.supabase.from("meeting_companies").select("company_id").eq("meeting_id", id),
      this.supabase.from("task_meetings").select("task_id").eq("meeting_id", id),
    ]);
    if (participantsResult.error || companiesResult.error || tasksResult.error)
      throw new MeetingPersistenceError();

    return toMeeting(
      data as MeetingRow,
      (participantsResult.data ?? []) as ParticipantRow[],
      (companiesResult.data ?? []) as CompanyRow[],
      (tasksResult.data ?? []) as TaskRow[],
    );
  }

  async create(values: ValidMeetingValues): Promise<Meeting> {
    return this.saveAggregate(null, values);
  }

  async update(meeting: Meeting, values: ValidMeetingValues): Promise<Meeting> {
    return this.saveAggregate(meeting.id, values);
  }

  async saveState(meeting: Meeting): Promise<Meeting> {
    const { error } = await this.supabase
      .from("meetings")
      .update({
        status: meeting.status,
        conclusion: meeting.conclusion,
        closed_at: meeting.closedAt,
      })
      .eq("id", meeting.id);
    if (error) throw new MeetingPersistenceError("Não foi possível alterar o estado da Meeting.");
    const saved = await this.findById(meeting.id);
    if (!saved) throw new MeetingPersistenceError();
    return saved;
  }

  async close(meeting: Meeting): Promise<Meeting> {
    const { error } = await this.supabase.rpc("close_meeting", {
      p_meeting_id: meeting.id,
      p_output: meeting.conclusion,
    });
    if (error)
      throw new MeetingPersistenceError(
        error.code === "42501"
          ? "Apenas participantes podem fechar esta Meeting."
          : "Não foi possível fechar a Meeting.",
      );
    const saved = await this.findById(meeting.id);
    if (!saved) throw new MeetingPersistenceError();
    return saved;
  }

  async delete(id: string): Promise<void> {
    const { error } = await this.supabase.rpc("delete_meeting", { p_meeting_id: id });
    if (error)
      throw new MeetingPersistenceError(
        error.code === "23503"
          ? "Esta Meeting ou Event tem histórico protegido e não pode ser eliminado."
          : "Não foi possível eliminar a Meeting ou Event.",
      );
  }

  private async saveAggregate(
    meetingId: string | null,
    values: ValidMeetingValues,
  ): Promise<Meeting> {
    const { data, error } = await this.supabase.rpc("save_meeting", {
      p_meeting_id: meetingId,
      p_values: toRpcValues(values),
      p_participants: values.participants.map(toRpcParticipant),
      p_company_ids: values.companyIds,
      p_task_ids: values.taskIds,
    });
    if (error || typeof data !== "string") {
      throw new MeetingPersistenceError(
        error ? meetingPersistenceMessage(error) : "Não foi possível guardar a Meeting.",
      );
    }
    const saved = await this.findById(data);
    if (!saved) throw new MeetingPersistenceError();
    return saved;
  }
}

function toRpcValues(values: ValidMeetingValues) {
  return {
    kind: values.kind,
    calendar_tone: values.calendarTone,
    title: values.title,
    starts_at: values.startsAt,
    ends_at: values.endsAt,
    notes: values.notes,
  };
}

function toRpcParticipant(participant: MeetingParticipant) {
  return {
    member_id: participant.memberId,
    contact_id: participant.contactId,
    external_name: participant.externalName,
  };
}

function toMeeting(
  row: MeetingRow,
  participants: ParticipantRow[],
  companies: CompanyRow[],
  tasks: TaskRow[],
): Meeting {
  return {
    id: row.id,
    kind: row.kind,
    calendarTone: row.calendar_tone,
    title: row.title,
    purpose: row.purpose,
    intendedResult: row.intended_result,
    status: row.status,
    closerMemberId: row.closer_member_id,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    agenda: row.agenda,
    notes: row.notes,
    openQuestions: row.open_questions,
    conclusion: row.conclusion,
    closedAt: row.closed_at,
    participants: participants.map((participant) => ({
      memberId: participant.member_id,
      contactId: participant.contact_id,
      externalName: participant.external_name,
    })),
    companyIds: companies.map((company) => company.company_id),
    taskIds: tasks.map((task) => task.task_id),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
