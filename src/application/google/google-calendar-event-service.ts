import type {
  GoogleCalendarEvent,
  GoogleCalendarGateway,
  GoogleCalendarSelectionRepository,
  GoogleConnectionRepository,
  GoogleOAuthGateway,
  GoogleTokenProtector,
} from "./contracts";

export class GoogleCalendarEventService {
  constructor(
    private readonly connections: GoogleConnectionRepository,
    private readonly selections: GoogleCalendarSelectionRepository,
    private readonly oauth: GoogleOAuthGateway,
    private readonly calendar: GoogleCalendarGateway,
    private readonly tokens: GoogleTokenProtector,
  ) {}

  async listVisibleEvents(
    memberId: string,
    range: Readonly<{ start: string; end: string }>,
  ): Promise<GoogleCalendarEvent[]> {
    const stored = await this.connections.findActiveByMemberId(memberId);
    if (!stored) return [];
    const selected = await this.selections.list(memberId);
    if (!selected.length) return [];

    const refreshToken = await this.tokens.reveal(stored.refreshToken);
    const accessToken = await this.oauth.refreshAccessToken(refreshToken);
    const results = await Promise.all(
      selected.map((selection) =>
        this.calendar.listEvents(accessToken, selection.calendarId, range),
      ),
    );
    return results.flat();
  }

  async getVisibleEvent(memberId: string, calendarId: string, eventId: string) {
    const stored = await this.connections.findActiveByMemberId(memberId);
    if (!stored) return null;
    const selected = await this.selections.list(memberId);
    if (!selected.some((selection) => selection.calendarId === calendarId)) return null;
    const refreshToken = await this.tokens.reveal(stored.refreshToken);
    const accessToken = await this.oauth.refreshAccessToken(refreshToken);
    return this.calendar.getEvent(accessToken, calendarId, eventId);
  }

  async deleteVisibleEvent(memberId: string, calendarId: string, eventId: string) {
    const stored = await this.connections.findActiveByMemberId(memberId);
    if (!stored) throw new Error("Google connection unavailable");
    const selected = await this.selections.list(memberId);
    if (!selected.some((item) => item.calendarId === calendarId))
      throw new Error("Google calendar unavailable");
    const refreshToken = await this.tokens.reveal(stored.refreshToken);
    const accessToken = await this.oauth.refreshAccessToken(refreshToken);
    await this.calendar.deleteEvent(accessToken, calendarId, eventId);
  }
}
