import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  GoogleMeetingMirror,
  GoogleMeetingMirrorRepository,
} from "@/application/google/contracts";

type MirrorRow = {
  calendar_id: string;
  google_event_id: string;
  meeting_id: string;
  member_id: string;
  sync_status: GoogleMeetingMirror["syncStatus"];
};

export class SupabaseGoogleMeetingMirrorRepository implements GoogleMeetingMirrorRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async find(memberId: string, meetingId: string): Promise<GoogleMeetingMirror | null> {
    const { data, error } = await this.supabase
      .from("google_meeting_mirrors")
      .select("member_id,meeting_id,calendar_id,google_event_id,sync_status")
      .eq("member_id", memberId)
      .eq("meeting_id", meetingId)
      .maybeSingle();
    if (error) throw new Error("Google mirror unavailable");
    if (!data) return null;
    const row = data as MirrorRow;
    return {
      calendarId: row.calendar_id,
      googleEventId: row.google_event_id,
      meetingId: row.meeting_id,
      memberId: row.member_id,
      syncStatus: row.sync_status,
    };
  }

  async save(mirror: GoogleMeetingMirror, lastSyncedAt: string | null): Promise<void> {
    const { error } = await this.supabase.rpc("save_google_meeting_mirror", {
      p_calendar_id: mirror.calendarId,
      p_google_event_id: mirror.googleEventId,
      p_last_synced_at: lastSyncedAt,
      p_meeting_id: mirror.meetingId,
      p_member_id: mirror.memberId,
      p_sync_status: mirror.syncStatus,
    });
    if (error) throw new Error("Google mirror unavailable");
  }
}
