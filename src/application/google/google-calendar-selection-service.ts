import type {
  GoogleCalendarGateway,
  GoogleCalendarOption,
  GoogleCalendarSelectionRepository,
  GoogleConnectionRepository,
  GoogleOAuthGateway,
  GoogleTokenProtector,
} from "@/application/google/contracts";

export type SelectableGoogleCalendar = GoogleCalendarOption &
  Readonly<{ publishesOsEvents: boolean; selected: boolean }>;

export class GoogleCalendarSelectionError extends Error {
  constructor(message = "Não foi possível carregar os calendários Google.") {
    super(message);
    this.name = "GoogleCalendarSelectionError";
  }
}

export class GoogleCalendarSelectionService {
  constructor(
    private readonly connectionRepository: GoogleConnectionRepository,
    private readonly selectionRepository: GoogleCalendarSelectionRepository,
    private readonly oauth: GoogleOAuthGateway,
    private readonly calendar: GoogleCalendarGateway,
    private readonly tokenProtector: GoogleTokenProtector,
  ) {}

  async listCalendars(memberId: string): Promise<SelectableGoogleCalendar[]> {
    const calendars = await this.loadLiveCalendars(memberId);
    const selections = await this.selectionRepository.list(memberId);
    const selectedIds = new Set(selections.map((selection) => selection.calendarId));
    const publishCalendarId = selections.find(
      (selection) => selection.publishesOsEvents,
    )?.calendarId;
    return calendars.map((calendar) => ({
      ...calendar,
      publishesOsEvents: calendar.id === publishCalendarId,
      selected: selectedIds.has(calendar.id),
    }));
  }

  async replaceSelection(
    memberId: string,
    requestedIds: readonly string[],
    requestedPublishCalendarId: string | null,
  ): Promise<void> {
    const calendars = await this.loadLiveCalendars(memberId);
    const availableById = new Map(calendars.map((calendar) => [calendar.id, calendar]));
    const selectedIds = [...new Set(requestedIds.map((id) => id.trim()).filter(Boolean))];

    if (selectedIds.some((id) => !availableById.has(id))) {
      throw new GoogleCalendarSelectionError("A seleção contém um calendário indisponível.");
    }

    const publishCalendarId = requestedPublishCalendarId?.trim() || null;
    if (publishCalendarId && !selectedIds.includes(publishCalendarId)) {
      throw new GoogleCalendarSelectionError("O calendário de publicação também tem de estar visível.");
    }
    const publishCalendar = publishCalendarId ? availableById.get(publishCalendarId) : null;
    if (publishCalendar && publishCalendar.accessRole === "reader") {
      throw new GoogleCalendarSelectionError("O calendário de publicação não permite criar eventos.");
    }

    await this.selectionRepository.replace(memberId, selectedIds, publishCalendarId);
  }

  private async loadLiveCalendars(memberId: string): Promise<GoogleCalendarOption[]> {
    const stored = await this.connectionRepository.findActiveByMemberId(memberId);
    if (!stored) throw new GoogleCalendarSelectionError("Liga primeiro uma conta Google.");

    try {
      const refreshToken = await this.tokenProtector.reveal(stored.refreshToken);
      const accessToken = await this.oauth.refreshAccessToken(refreshToken);
      return await this.calendar.listCalendars(accessToken);
    } catch {
      throw new GoogleCalendarSelectionError();
    }
  }
}
