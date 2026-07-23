import "server-only";

import type {
  GoogleCalendarEvent,
  GoogleCalendarEventInput,
  GoogleCalendarGateway,
  GoogleCalendarOption,
} from "@/application/google/contracts";

type Fetcher = typeof fetch;

type CalendarListItem = {
  accessRole?: unknown;
  id?: unknown;
  primary?: unknown;
  summary?: unknown;
  summaryOverride?: unknown;
};

type EventItem = {
  description?: unknown;
  end?: { date?: unknown; dateTime?: unknown };
  extendedProperties?: { private?: Record<string, unknown> };
  eventType?: unknown;
  htmlLink?: unknown;
  id?: unknown;
  location?: unknown;
  start?: { date?: unknown; dateTime?: unknown };
  status?: unknown;
  summary?: unknown;
  transparency?: unknown;
};

export class GoogleCalendarRequestError extends Error {
  constructor() {
    super("Não foi possível carregar os calendários Google.");
    this.name = "GoogleCalendarRequestError";
  }
}

export class GoogleCalendarClient implements GoogleCalendarGateway {
  constructor(private readonly fetcher: Fetcher = fetch) {}

  async listCalendars(accessToken: string): Promise<GoogleCalendarOption[]> {
    const calendars: GoogleCalendarOption[] = [];
    let pageToken: string | null = null;

    for (let page = 0; page < 10; page += 1) {
      const url = new URL("https://www.googleapis.com/calendar/v3/users/me/calendarList");
      url.searchParams.set("maxResults", "250");
      url.searchParams.set("minAccessRole", "reader");
      url.searchParams.set("showDeleted", "false");
      url.searchParams.set("showHidden", "false");
      if (pageToken) url.searchParams.set("pageToken", pageToken);

      const response = await this.fetcher(url, {
        cache: "no-store",
        headers: { Authorization: `Bearer ${accessToken}` },
        signal: AbortSignal.timeout(15_000),
      });
      const body = (await response.json().catch(() => null)) as {
        items?: unknown;
        nextPageToken?: unknown;
      } | null;
      if (!response.ok || !Array.isArray(body?.items)) throw new GoogleCalendarRequestError();

      for (const item of body.items as CalendarListItem[]) {
        const calendar = toCalendarOption(item);
        if (calendar) calendars.push(calendar);
      }

      pageToken = typeof body.nextPageToken === "string" ? body.nextPageToken : null;
      if (!pageToken) return calendars;
    }

    throw new GoogleCalendarRequestError();
  }

  async listEvents(
    accessToken: string,
    calendarId: string,
    range: Readonly<{ start: string; end: string }>,
  ): Promise<GoogleCalendarEvent[]> {
    const events: GoogleCalendarEvent[] = [];
    let pageToken: string | null = null;

    for (let page = 0; page < 20; page += 1) {
      const url = new URL(
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`,
      );
      url.searchParams.set("maxResults", "2500");
      url.searchParams.set("orderBy", "startTime");
      url.searchParams.set("showDeleted", "false");
      url.searchParams.set("singleEvents", "true");
      const startKey = calendarDateKey(range.start);
      const endKey = calendarDateKey(range.end);
      url.searchParams.set("timeMin", lisbonBoundary(startKey));
      url.searchParams.set("timeMax", lisbonBoundary(addUtcDays(endKey, 1)));
      url.searchParams.set("timeZone", "Europe/Lisbon");
      if (pageToken) url.searchParams.set("pageToken", pageToken);

      const response = await this.fetcher(url, {
        cache: "no-store",
        headers: { Authorization: `Bearer ${accessToken}` },
        signal: AbortSignal.timeout(15_000),
      });
      const body = (await response.json().catch(() => null)) as {
        items?: unknown;
        nextPageToken?: unknown;
      } | null;
      if (!response.ok || !Array.isArray(body?.items)) throw new GoogleCalendarRequestError();

      for (const item of body.items as EventItem[]) {
        const event = toCalendarEvent(calendarId, item);
        if (event) events.push(event);
      }

      pageToken = typeof body.nextPageToken === "string" ? body.nextPageToken : null;
      if (!pageToken) return events;
    }

    throw new GoogleCalendarRequestError();
  }

  async upsertEvent(
    accessToken: string,
    calendarId: string,
    eventId: string,
    event: GoogleCalendarEventInput,
  ): Promise<void> {
    const eventUrl = googleEventUrl(calendarId, eventId);
    eventUrl.searchParams.set("sendUpdates", "none");
    const body = eventBody(event);
    const update = await this.fetcher(eventUrl, {
      body: JSON.stringify(body),
      cache: "no-store",
      headers: googleHeaders(accessToken),
      method: "PUT",
      signal: AbortSignal.timeout(15_000),
    });
    if (update.ok) return;
    if (update.status !== 404) throw new GoogleCalendarRequestError();

    const collectionUrl = new URL(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`,
    );
    collectionUrl.searchParams.set("sendUpdates", "none");
    const insert = await this.fetcher(collectionUrl, {
      body: JSON.stringify({ ...body, id: eventId }),
      cache: "no-store",
      headers: googleHeaders(accessToken),
      method: "POST",
      signal: AbortSignal.timeout(15_000),
    });
    if (insert.ok) return;
    if (insert.status === 409) {
      const retry = await this.fetcher(eventUrl, {
        body: JSON.stringify(body),
        cache: "no-store",
        headers: googleHeaders(accessToken),
        method: "PUT",
        signal: AbortSignal.timeout(15_000),
      });
      if (retry.ok) return;
    }
    throw new GoogleCalendarRequestError();
  }

  async getEvent(
    accessToken: string,
    calendarId: string,
    eventId: string,
  ): Promise<GoogleCalendarEvent | null> {
    const response = await this.fetcher(googleEventUrl(calendarId, eventId), {
      cache: "no-store",
      headers: { Authorization: `Bearer ${accessToken}` },
      signal: AbortSignal.timeout(15_000),
    });
    if (response.status === 404 || response.status === 410) return null;
    const body = (await response.json().catch(() => null)) as EventItem | null;
    if (!response.ok || !body) throw new GoogleCalendarRequestError();
    return toCalendarEvent(calendarId, body, false);
  }

  async deleteEvent(accessToken: string, calendarId: string, eventId: string): Promise<void> {
    const url = googleEventUrl(calendarId, eventId);
    url.searchParams.set("sendUpdates", "none");
    const response = await this.fetcher(url, {
      cache: "no-store",
      headers: { Authorization: `Bearer ${accessToken}` },
      method: "DELETE",
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok && response.status !== 404 && response.status !== 410) {
      throw new GoogleCalendarRequestError();
    }
  }
}

function toCalendarOption(item: CalendarListItem): GoogleCalendarOption | null {
  if (typeof item.id !== "string" || typeof item.summary !== "string") return null;
  if (!isReadableAccessRole(item.accessRole)) return null;
  const override = typeof item.summaryOverride === "string" ? item.summaryOverride.trim() : "";
  return {
    accessRole: item.accessRole,
    id: item.id,
    name: override || item.summary,
    primary: item.primary === true,
  };
}

function isReadableAccessRole(value: unknown): value is GoogleCalendarOption["accessRole"] {
  return value === "reader" || value === "writer" || value === "owner";
}

function toCalendarEvent(
  calendarId: string,
  item: EventItem,
  excludeVougaMirror = true,
): GoogleCalendarEvent | null {
  if (excludeVougaMirror && item.extendedProperties?.private?.vouga_os_meeting_id) return null;
  if (
    typeof item.id !== "string" ||
    typeof item.htmlLink !== "string" ||
    (item.status !== "confirmed" && item.status !== "tentative")
  ) {
    return null;
  }
  const timedStart = typeof item.start?.dateTime === "string" ? item.start.dateTime : null;
  const timedEnd = typeof item.end?.dateTime === "string" ? item.end.dateTime : null;
  const allDayStart = typeof item.start?.date === "string" ? item.start.date : null;
  const allDayEnd = typeof item.end?.date === "string" ? item.end.date : null;
  const allDay = Boolean(allDayStart && allDayEnd);
  if ((!timedStart || !timedEnd) && !allDay) return null;

  return {
    allDay,
    calendarId,
    description: typeof item.description === "string" ? item.description : null,
    end: allDay ? addUtcDays(allDayEnd!, -1) : new Date(timedEnd!).toISOString(),
    eventType: typeof item.eventType === "string" ? item.eventType : null,
    htmlLink: item.htmlLink,
    id: item.id,
    location: typeof item.location === "string" ? item.location : null,
    start: allDay ? allDayStart! : new Date(timedStart!).toISOString(),
    status: item.status,
    title: typeof item.summary === "string" && item.summary.trim() ? item.summary : "Sem título",
    transparency: typeof item.transparency === "string" ? item.transparency : null,
  };
}

function addUtcDays(dateKey: string, days: number): string {
  const date = new Date(`${calendarDateKey(dateKey)}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function calendarDateKey(value: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const date = new Date(value);
  if (Number.isFinite(date.getTime())) return date.toISOString().slice(0, 10);
  throw new GoogleCalendarRequestError();
}

function lisbonBoundary(dateKey: string): string {
  const [year, month, day] = calendarDateKey(dateKey).split("-").map(Number);
  const target = Date.UTC(year, month - 1, day);
  let candidate = target;
  for (let iteration = 0; iteration < 4; iteration += 1) {
    const parts = new Intl.DateTimeFormat("en-CA", {
      day: "2-digit",
      hour: "2-digit",
      hourCycle: "h23",
      minute: "2-digit",
      month: "2-digit",
      timeZone: "Europe/Lisbon",
      year: "numeric",
    }).formatToParts(new Date(candidate));
    const value = (type: Intl.DateTimeFormatPartTypes) =>
      Number(parts.find((part) => part.type === type)?.value);
    const represented = Date.UTC(
      value("year"),
      value("month") - 1,
      value("day"),
      value("hour"),
      value("minute"),
    );
    const correction = target - represented;
    candidate += correction;
    if (!correction) break;
  }
  return new Date(candidate).toISOString();
}

function googleEventUrl(calendarId: string, eventId: string): URL {
  return new URL(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
  );
}

function googleHeaders(accessToken: string): HeadersInit {
  return {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
  };
}

function eventBody(event: GoogleCalendarEventInput) {
  return {
    attendees: [],
    ...(event.colorId ? { colorId: event.colorId } : {}),
    description: event.description,
    end: event.allDay
      ? { date: dateKeyInLisbon(event.end) }
      : { dateTime: event.end, timeZone: "Europe/Lisbon" },
    extendedProperties: {
      private: {
        vouga_os_meeting_id: event.meetingId,
        vouga_os_meeting_kind: event.meetingKind,
        vouga_os_source: "meeting",
      },
    },
    reminders: { useDefault: true },
    start: event.allDay
      ? { date: dateKeyInLisbon(event.start) }
      : { dateTime: event.start, timeZone: "Europe/Lisbon" },
    status: "confirmed",
    summary: event.title,
    transparency: "opaque",
  };
}

function dateKeyInLisbon(value: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "Europe/Lisbon",
    year: "numeric",
  }).format(new Date(value));
}
