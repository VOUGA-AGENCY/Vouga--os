import { describe, expect, test, vi } from "vitest";

import type {
  GoogleCalendarGateway,
  GoogleCalendarSelectionRepository,
  GoogleConnectionRepository,
  GoogleOAuthGateway,
  GoogleTokenProtector,
  StoredGoogleConnection,
} from "./contracts";
import {
  GoogleCalendarSelectionError,
  GoogleCalendarSelectionService,
} from "./google-calendar-selection-service";

const stored: StoredGoogleConnection = {
  connection: {
    connectedAt: "2026-07-19T15:00:00.000Z",
    email: "hello@vouga-agency.pt",
    memberId: "member-1",
    providerSubject: "google-subject",
    revokedAt: null,
    scopes: ["calendar"],
    status: "active",
    updatedAt: "2026-07-19T15:00:00.000Z",
  },
  refreshToken: { ciphertext: "cipher", iv: "iv", keyVersion: 1 },
};

function setup() {
  const connectionRepository: GoogleConnectionRepository = {
    findActiveByMemberId: vi.fn().mockResolvedValue(stored),
    revoke: vi.fn(),
    save: vi.fn(),
  };
  const selectionRepository: GoogleCalendarSelectionRepository = {
    list: vi.fn().mockResolvedValue([
      { calendarId: "primary", publishesOsEvents: true },
    ]),
    replace: vi.fn().mockResolvedValue(undefined),
  };
  const oauth: GoogleOAuthGateway = {
    createAuthorizationUrl: vi.fn(),
    exchangeAuthorizationCode: vi.fn(),
    getIdentity: vi.fn(),
    refreshAccessToken: vi.fn().mockResolvedValue("access-token"),
    revokeToken: vi.fn(),
  };
  const calendar: GoogleCalendarGateway = {
    getEvent: vi.fn(),
    listCalendars: vi.fn().mockResolvedValue([
      { accessRole: "owner", id: "primary", name: "Vouga", primary: true },
      { accessRole: "reader", id: "team", name: "Team", primary: false },
    ]),
    deleteEvent: vi.fn(),
    listEvents: vi.fn(),
    upsertEvent: vi.fn(),
  };
  const tokenProtector: GoogleTokenProtector = {
    protect: vi.fn(),
    reveal: vi.fn().mockResolvedValue("refresh-token"),
  };
  const service = new GoogleCalendarSelectionService(
    connectionRepository,
    selectionRepository,
    oauth,
    calendar,
    tokenProtector,
  );
  return { calendar, oauth, selectionRepository, service };
}

describe("GoogleCalendarSelectionService", () => {
  test("compõe calendários live com os IDs selecionados localmente", async () => {
    const { service } = setup();
    await expect(service.listCalendars("member-1")).resolves.toEqual([
      {
        accessRole: "owner",
        id: "primary",
        name: "Vouga",
        primary: true,
        publishesOsEvents: true,
        selected: true,
      },
      {
        accessRole: "reader",
        id: "team",
        name: "Team",
        primary: false,
        publishesOsEvents: false,
        selected: false,
      },
    ]);
  });

  test("valida a seleção contra a lista live antes de persistir IDs", async () => {
    const { selectionRepository, service } = setup();
    await service.replaceSelection("member-1", ["primary", "primary"], "primary");
    expect(selectionRepository.replace).toHaveBeenCalledWith(
      "member-1",
      ["primary"],
      "primary",
    );

    await expect(
      service.replaceSelection("member-1", ["unknown"], null),
    ).rejects.toBeInstanceOf(GoogleCalendarSelectionError);
    await expect(service.replaceSelection("member-1", ["team"], "team")).rejects.toBeInstanceOf(
      GoogleCalendarSelectionError,
    );
  });
});
