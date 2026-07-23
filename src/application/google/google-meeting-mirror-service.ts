import type { Meeting } from "@/domain/meetings/meeting";

import type {
  GoogleCalendarEventInput,
  GoogleCalendarGateway,
  GoogleCalendarSelectionRepository,
  GoogleConnectionRepository,
  GoogleMeetingMirror,
  GoogleMeetingMirrorRepository,
  GoogleOAuthGateway,
  GoogleTokenProtector,
} from "./contracts";

export type GoogleMirrorResult = "synced" | "not-configured" | "error";

export class GoogleMeetingMirrorService {
  constructor(
    private readonly connections: GoogleConnectionRepository,
    private readonly selections: GoogleCalendarSelectionRepository,
    private readonly mirrors: GoogleMeetingMirrorRepository,
    private readonly oauth: GoogleOAuthGateway,
    private readonly calendar: GoogleCalendarGateway,
    private readonly tokens: GoogleTokenProtector,
    private readonly now: () => string = () => new Date().toISOString(),
  ) {}

  async publish(memberId: string, meeting: Meeting): Promise<GoogleMirrorResult> {
    const configuration = await this.configuration(memberId);
    if (!configuration) return "not-configured";
    const existing = await this.mirrors.find(memberId, meeting.id);
    const mirror = this.mirror(
      memberId,
      meeting.id,
      configuration.calendarId,
      existing?.googleEventId ?? googleEventId(meeting.id),
      "pending",
    );

    try {
      const accessToken = await this.accessToken(configuration.refreshToken);
      if (existing && existing.calendarId !== configuration.calendarId) {
        await this.calendar.deleteEvent(accessToken, existing.calendarId, existing.googleEventId);
      }
      await this.mirrors.save(mirror, null);
      await this.calendar.upsertEvent(
        accessToken,
        mirror.calendarId,
        mirror.googleEventId,
        eventInput(meeting),
      );
      await this.mirrors.save({ ...mirror, syncStatus: "synced" }, this.now());
      return "synced";
    } catch {
      await this.mirrors.save({ ...mirror, syncStatus: "error" }, null).catch(() => undefined);
      return "error";
    }
  }

  async remove(memberId: string, meeting: Meeting): Promise<GoogleMirrorResult> {
    const configuration = await this.configuration(memberId);
    if (!configuration) return "not-configured";
    const existing = await this.mirrors.find(memberId, meeting.id);
    if (!existing) return "not-configured";

    try {
      const accessToken = await this.accessToken(configuration.refreshToken);
      await this.calendar.deleteEvent(accessToken, existing.calendarId, existing.googleEventId);
      await this.mirrors.save({ ...existing, syncStatus: "deleted" }, this.now());
      return "synced";
    } catch {
      await this.mirrors.save({ ...existing, syncStatus: "error" }, null).catch(() => undefined);
      return "error";
    }
  }

  private async configuration(memberId: string) {
    const [stored, selections] = await Promise.all([
      this.connections.findActiveByMemberId(memberId),
      this.selections.list(memberId),
    ]);
    const calendarId = selections.find((selection) => selection.publishesOsEvents)?.calendarId;
    if (!stored || !calendarId) return null;
    return { calendarId, refreshToken: stored.refreshToken };
  }

  private async accessToken(refreshToken: Parameters<GoogleTokenProtector["reveal"]>[0]) {
    return this.oauth.refreshAccessToken(await this.tokens.reveal(refreshToken));
  }

  private mirror(
    memberId: string,
    meetingId: string,
    calendarId: string,
    eventId: string,
    syncStatus: GoogleMeetingMirror["syncStatus"],
  ): GoogleMeetingMirror {
    return { calendarId, googleEventId: eventId, meetingId, memberId, syncStatus };
  }
}

function googleEventId(meetingId: string): string {
  return `vouga${meetingId.toLowerCase().replace(/[^0-9a-f]/g, "")}`;
}

function eventInput(meeting: Meeting): GoogleCalendarEventInput {
  return {
    allDay: meeting.kind === "vacation",
    colorId: meeting.calendarTone ? GOOGLE_COLOR_IDS[meeting.calendarTone] : null,
    description: meeting.notes ?? "",
    end: meeting.endsAt,
    meetingId: meeting.id,
    meetingKind: meeting.kind,
    start: meeting.startsAt,
    title: meeting.title,
  };
}

const GOOGLE_COLOR_IDS: Record<import("@/domain/meetings/meeting").VacationTone, string> = {
  orange: "6",
  blue: "9",
  green: "10",
  purple: "3",
  pink: "4",
  red: "11",
};
