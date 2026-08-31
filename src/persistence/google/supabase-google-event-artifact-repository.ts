import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { GoogleEventArtifactRepository } from "@/application/google/contracts";
import type { GoogleEventArtifact } from "@/domain/google/google-event-artifact";

type ArtifactRow = {
  member_id: string;
  calendar_id: string;
  google_event_id: string;
  classification: GoogleEventArtifact["classification"];
  owner_member_id: string | null;
  purpose: string | null;
  notes: string | null;
  output: string | null;
  output_at: string | null;
};

export class SupabaseGoogleEventArtifactRepository implements GoogleEventArtifactRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async find(memberId: string, calendarId: string, eventId: string) {
    const [artifact, companies, contacts, participants, tasks] = await Promise.all([
      this.supabase
        .from("google_event_artifacts")
        .select(
          "member_id,calendar_id,google_event_id,classification,owner_member_id,purpose,notes,output,output_at",
        )
        .eq("member_id", memberId)
        .eq("calendar_id", calendarId)
        .eq("google_event_id", eventId)
        .maybeSingle(),
      this.supabase
        .from("google_event_artifact_companies")
        .select("company_id")
        .eq("member_id", memberId)
        .eq("calendar_id", calendarId)
        .eq("google_event_id", eventId),
      this.supabase
        .from("google_event_artifact_contacts")
        .select("contact_id")
        .eq("member_id", memberId)
        .eq("calendar_id", calendarId)
        .eq("google_event_id", eventId),
      this.supabase
        .from("google_event_artifact_participants")
        .select("participant_member_id")
        .eq("member_id", memberId)
        .eq("calendar_id", calendarId)
        .eq("google_event_id", eventId),
      this.supabase
        .from("google_event_artifact_tasks")
        .select("task_id")
        .eq("member_id", memberId)
        .eq("calendar_id", calendarId)
        .eq("google_event_id", eventId),
    ]);
    if (artifact.error || companies.error || contacts.error || participants.error || tasks.error)
      throw new Error("Google artifact unavailable");
    if (!artifact.data) return null;
    return mapArtifact(
      artifact.data as ArtifactRow,
      (companies.data ?? []).map((row) => String(row.company_id)),
      (contacts.data ?? []).map((row) => String(row.contact_id)),
      (participants.data ?? []).map((row) => String(row.participant_member_id)),
      (tasks.data ?? []).map((row) => String(row.task_id)),
    );
  }

  async list(memberId: string) {
    const { data, error } = await this.supabase
      .from("google_event_artifacts")
      .select(
        "member_id,calendar_id,google_event_id,classification,owner_member_id,purpose,notes,output,output_at",
      )
      .eq("member_id", memberId);
    if (error) throw new Error("Google artifacts unavailable");
    return (data as ArtifactRow[]).map((row) => mapArtifact(row, [], [], [], []));
  }

  async listShared() {
    const { data, error } = await this.supabase
      .from("google_event_artifacts")
      .select("member_id,calendar_id,google_event_id,classification,owner_member_id,purpose,notes,output,output_at");
    if (error) throw new Error("Google artifacts unavailable");
    return (data as ArtifactRow[]).map((row) => mapArtifact(row, [], [], [], []));
  }

  async save(artifact: GoogleEventArtifact) {
    const { error } = await this.supabase.rpc("save_google_event_artifact", {
      p_calendar_id: artifact.calendarId,
      p_company_ids: artifact.companyIds,
      p_participant_member_ids: artifact.participantMemberIds,
      p_task_ids: artifact.taskIds,
      p_google_event_id: artifact.googleEventId,
      p_member_id: artifact.memberId,
      p_values: {
        classification: artifact.classification,
        notes: artifact.notes,
        output: artifact.output,
        output_at: artifact.outputAt,
      },
    });
    if (error) throw new Error("Google artifact unavailable");
  }

  async hasTaskOrigins(memberId: string, calendarId: string, eventId: string) {
    const { data, error } = await this.supabase
      .from("tasks")
      .select("id")
      .eq("origin_type", "google_event")
      .eq("origin_google_member_id", memberId)
      .eq("origin_google_calendar_id", calendarId)
      .eq("origin_google_event_id", eventId)
      .limit(1);
    if (error) throw new Error("Google artifact unavailable");
    return (data ?? []).length > 0;
  }
  async delete(memberId: string, calendarId: string, eventId: string) {
    const { error } = await this.supabase.rpc("delete_google_event_artifact", {
      p_member_id: memberId,
      p_calendar_id: calendarId,
      p_google_event_id: eventId,
    });
    if (error)
      throw new Error(
        error.code === "23503"
          ? "Este evento é origem de uma Task e não pode ser eliminado."
          : "Não foi possível eliminar o contexto Google.",
      );
  }
}

function mapArtifact(
  row: ArtifactRow,
  companyIds: readonly string[],
  contactIds: readonly string[],
  participantMemberIds: readonly string[],
  taskIds: readonly string[],
): GoogleEventArtifact {
  return {
    calendarId: row.calendar_id,
    classification: row.classification,
    companyIds,
    contactIds,
    participantMemberIds,
    taskIds,
    googleEventId: row.google_event_id,
    memberId: row.member_id,
    notes: row.notes,
    output: row.output,
    outputAt: row.output_at,
    ownerMemberId: row.owner_member_id,
    purpose: row.purpose,
  };
}
