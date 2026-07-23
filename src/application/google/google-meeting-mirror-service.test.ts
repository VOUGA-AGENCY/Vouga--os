import { describe, expect, it, vi } from "vitest";

import type { Meeting } from "@/domain/meetings/meeting";

import type {
  GoogleCalendarGateway,
  GoogleCalendarSelectionRepository,
  GoogleConnectionRepository,
  GoogleMeetingMirrorRepository,
  GoogleOAuthGateway,
  GoogleTokenProtector,
  StoredGoogleConnection,
} from "./contracts";
import { GoogleMeetingMirrorService } from "./google-meeting-mirror-service";

const meeting: Meeting = {
  agenda: "Decidir próximos passos",
  closerMemberId: "member-1",
  closedAt: null,
  companyIds: [],
  conclusion: null,
  createdAt: "2026-07-19T10:00:00.000Z",
  endsAt: "2026-07-20T10:00:00.000Z",
  id: "11111111-2222-4333-8444-555555555555",
  intendedResult: "Plano acordado",
  kind: "meeting",
  calendarTone: null,
  notes: "Contexto partilhado",
  openQuestions: null,
  participants: [{ externalName: "Ana", contactId: null, memberId: null }],
  purpose: "Alinhar",
  startsAt: "2026-07-20T09:00:00.000Z",
  status: "planned",
  title: "Partner meeting",
  updatedAt: "2026-07-19T10:00:00.000Z",
};

function setup() {
  const stored: StoredGoogleConnection = {
    connection: {
      connectedAt: "2026-07-19T10:00:00.000Z",
      email: "hello@vouga-agency.pt",
      memberId: "member-1",
      providerSubject: "subject",
      revokedAt: null,
      scopes: ["calendar"],
      status: "active",
      updatedAt: "2026-07-19T10:00:00.000Z",
    },
    refreshToken: { ciphertext: "cipher", iv: "iv", keyVersion: 1 },
  };
  const connections: GoogleConnectionRepository = {
    findActiveByMemberId: vi.fn().mockResolvedValue(stored),
    revoke: vi.fn(),
    save: vi.fn(),
  };
  const selections: GoogleCalendarSelectionRepository = {
    list: vi.fn().mockResolvedValue([{ calendarId: "primary", publishesOsEvents: true }]),
    replace: vi.fn(),
  };
  const mirrors: GoogleMeetingMirrorRepository = {
    find: vi.fn().mockResolvedValue(null),
    save: vi.fn().mockResolvedValue(undefined),
  };
  const oauth: GoogleOAuthGateway = {
    createAuthorizationUrl: vi.fn(),
    createPickerAuthorizationUrl: vi.fn(),
    exchangeAuthorizationCode: vi.fn(),
    getIdentity: vi.fn(),
    refreshAccessToken: vi.fn().mockResolvedValue("access"),
    revokeToken: vi.fn(),
  };
  const upsertEvent = vi.fn();
  const calendar: GoogleCalendarGateway = {
    deleteEvent: vi.fn(),
    getEvent: vi.fn(),
    listCalendars: vi.fn(),
    listEvents: vi.fn(),
    upsertEvent,
  };
  const tokens: GoogleTokenProtector = {
    protect: vi.fn(),
    reveal: vi.fn().mockResolvedValue("refresh"),
  };
  const service = new GoogleMeetingMirrorService(
    connections,
    selections,
    mirrors,
    oauth,
    calendar,
    tokens,
    () => "2026-07-19T17:00:00.000Z",
  );
  return { calendar, mirrors, service, upsertEvent };
}

describe("GoogleMeetingMirrorService", () => {
  it("publica título, intervalo e notas sem participantes ou output", async () => {
    const { calendar, mirrors, service, upsertEvent } = setup();

    await expect(service.publish("member-1", meeting)).resolves.toBe("synced");
    expect(calendar.upsertEvent).toHaveBeenCalledWith(
      "access",
      "primary",
      "vouga11111111222243338444555555555555",
      expect.objectContaining({
        allDay: false,
        colorId: null,
        end: meeting.endsAt,
        meetingId: meeting.id,
        meetingKind: "meeting",
        start: meeting.startsAt,
        title: meeting.title,
      }),
    );
    const input = upsertEvent.mock.calls[0][3];
    expect(input.description).toBe("Contexto partilhado");
    expect(input.description).not.toContain("Ana");
    expect(mirrors.save).toHaveBeenLastCalledWith(
      expect.objectContaining({ syncStatus: "synced" }),
      "2026-07-19T17:00:00.000Z",
    );
  });

  it("publica Vacation como all-day com a cor equivalente no Google", async () => {
    const { service, upsertEvent } = setup();
    await service.publish("member-1", {
      ...meeting,
      kind: "vacation",
      calendarTone: "purple",
      title: "Vacation · Miguel",
      startsAt: "2026-07-19T23:00:00.000Z",
      endsAt: "2026-07-25T23:00:00.000Z",
    });
    expect(upsertEvent).toHaveBeenCalledWith(
      "access",
      "primary",
      expect.any(String),
      expect.objectContaining({
        allDay: true,
        colorId: "3",
        meetingKind: "vacation",
        title: "Vacation · Miguel",
      }),
    );
  });

  it("preserva o save local e marca erro quando o Google falha", async () => {
    const { mirrors, service, upsertEvent } = setup();
    upsertEvent.mockRejectedValue(new Error("offline"));

    await expect(service.publish("member-1", meeting)).resolves.toBe("error");
    expect(mirrors.save).toHaveBeenLastCalledWith(
      expect.objectContaining({ syncStatus: "error" }),
      null,
    );
  });
});
