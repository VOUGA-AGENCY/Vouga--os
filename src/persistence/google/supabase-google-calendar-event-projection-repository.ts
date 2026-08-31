import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { GoogleCalendarEvent } from "@/application/google/contracts";

type Row = {
  calendar_id: string; google_event_id: string; title: string; description: string | null;
  location: string | null; starts_at: string; ends_at: string; all_day: boolean;
  status: "confirmed" | "tentative"; transparency: string | null; event_type: string | null;
  html_link: string;
};

const COLUMNS = "calendar_id,google_event_id,title,description,location,starts_at,ends_at,all_day,status,transparency,event_type,html_link";

export class SupabaseGoogleCalendarEventProjectionRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async replace(ownerMemberId: string, range: { start: string; end: string }, events: readonly GoogleCalendarEvent[]) {
    const { error } = await this.supabase.rpc("replace_google_calendar_event_projections", {
      p_events: events.map((event) => ({
        all_day: event.allDay, calendar_id: event.calendarId, description: event.description ?? "",
        ends_at: event.end, event_type: event.eventType ?? "", google_event_id: event.id,
        html_link: event.htmlLink, location: event.location ?? "", sort_at: sortAt(event),
        starts_at: event.start, status: event.status, title: event.title,
        transparency: event.transparency ?? "",
      })),
      p_owner_member_id: ownerMemberId,
      p_range_end: `${range.end}T23:59:59.999Z`,
      p_range_start: `${range.start}T00:00:00.000Z`,
    });
    if (error) throw new Error("Google Calendar projection unavailable");
  }

  async listShared(range: { start: string; end: string }): Promise<GoogleCalendarEvent[]> {
    const { data, error } = await this.supabase.from("google_calendar_event_projections")
      .select(COLUMNS).gte("sort_at", `${range.start}T00:00:00.000Z`)
      .lte("sort_at", `${range.end}T23:59:59.999Z`).order("sort_at");
    if (error) throw new Error("Google Calendar projection unavailable");
    return (data as Row[]).map(toEvent);
  }

  async findShared(calendarId: string, eventId: string): Promise<GoogleCalendarEvent | null> {
    const { data, error } = await this.supabase.from("google_calendar_event_projections")
      .select(COLUMNS).eq("calendar_id", calendarId).eq("google_event_id", eventId)
      .order("sort_at", { ascending: false }).limit(1).maybeSingle();
    if (error) throw new Error("Google Calendar projection unavailable");
    return data ? toEvent(data as Row) : null;
  }
}

function sortAt(event: GoogleCalendarEvent) {
  return event.allDay ? `${event.start}T00:00:00.000Z` : event.start;
}
function toEvent(row: Row): GoogleCalendarEvent {
  return { allDay: row.all_day, calendarId: row.calendar_id, description: row.description,
    end: row.ends_at, eventType: row.event_type, htmlLink: row.html_link, id: row.google_event_id,
    location: row.location, start: row.starts_at, status: row.status, title: row.title,
    transparency: row.transparency };
}
