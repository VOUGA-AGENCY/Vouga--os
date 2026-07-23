import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  GoogleCalendarSelection,
  GoogleCalendarSelectionRepository,
} from "@/application/google/contracts";

type SelectionRow = { calendar_id: string; publishes_os_events: boolean };

export class GoogleCalendarSelectionPersistenceError extends Error {
  constructor() {
    super("Não foi possível guardar os calendários selecionados.");
    this.name = "GoogleCalendarSelectionPersistenceError";
  }
}

export class SupabaseGoogleCalendarSelectionRepository implements GoogleCalendarSelectionRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async list(memberId: string): Promise<GoogleCalendarSelection[]> {
    const { data, error } = await this.supabase
      .from("google_calendar_selections")
      .select("calendar_id,publishes_os_events")
      .eq("member_id", memberId)
      .order("calendar_id");

    if (error) throw new GoogleCalendarSelectionPersistenceError();
    return (data as SelectionRow[]).map((row) => ({
      calendarId: row.calendar_id,
      publishesOsEvents: row.publishes_os_events,
    }));
  }

  async replace(
    memberId: string,
    calendarIds: readonly string[],
    publishCalendarId: string | null,
  ): Promise<void> {
    const { error } = await this.supabase.rpc("save_google_calendar_settings", {
      p_calendar_ids: calendarIds,
      p_member_id: memberId,
      p_publish_calendar_id: publishCalendarId,
    });
    if (error) throw new GoogleCalendarSelectionPersistenceError();
  }
}
