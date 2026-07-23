import { describe, expect, test, vi } from "vitest";

import { GoogleCalendarClient } from "./google-calendar-client";

describe("GoogleCalendarClient", () => {
  test("lista apenas calendários com leitura factual de eventos", async () => {
    const fetcher = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          items: [
            { accessRole: "owner", id: "primary", primary: true, summary: "Vouga" },
            { accessRole: "reader", id: "team", summary: "Team", summaryOverride: "Equipa" },
            { accessRole: "freeBusyReader", id: "busy", summary: "Busy" },
          ],
        }),
        { status: 200 },
      ),
    );
    const client = new GoogleCalendarClient(fetcher);

    await expect(client.listCalendars("access-token")).resolves.toEqual([
      { accessRole: "owner", id: "primary", name: "Vouga", primary: true },
      { accessRole: "reader", id: "team", name: "Equipa", primary: false },
    ]);
    const url = fetcher.mock.calls[0]?.[0] as URL;
    expect(url.searchParams.get("minAccessRole")).toBe("reader");
  });

  test("expande eventos por janela e exclui mirrors do Vouga OS", async () => {
    const fetcher = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          items: [
            {
              end: { dateTime: "2026-07-20T11:00:00+01:00" },
              eventType: "default",
              htmlLink: "https://calendar.google.com/event?eid=external",
              id: "external",
              start: { dateTime: "2026-07-20T10:00:00+01:00" },
              status: "confirmed",
              summary: "Partner call",
              transparency: "opaque",
            },
            {
              end: { dateTime: "2026-07-20T13:00:00+01:00" },
              extendedProperties: { private: { vouga_os_meeting_id: "meeting-1" } },
              htmlLink: "https://calendar.google.com/event?eid=mirror",
              id: "mirror",
              start: { dateTime: "2026-07-20T12:00:00+01:00" },
              status: "confirmed",
              summary: "OS mirror",
            },
          ],
        }),
        { status: 200 },
      ),
    );
    const client = new GoogleCalendarClient(fetcher);

    await expect(
      client.listEvents("access-token", "primary", {
        start: "2026-07-20",
        end: "2026-07-26",
      }),
    ).resolves.toEqual([
      {
        allDay: false,
        calendarId: "primary",
        description: null,
        end: "2026-07-20T10:00:00.000Z",
        eventType: "default",
        htmlLink: "https://calendar.google.com/event?eid=external",
        id: "external",
        location: null,
        start: "2026-07-20T09:00:00.000Z",
        status: "confirmed",
        title: "Partner call",
        transparency: "opaque",
      },
    ]);
    const url = fetcher.mock.calls[0]?.[0] as URL;
    expect(url.searchParams.get("singleEvents")).toBe("true");
    expect(url.searchParams.get("orderBy")).toBe("startTime");
    expect(url.searchParams.get("timeZone")).toBe("Europe/Lisbon");
  });

  test("aceita janelas ISO vindas de fluxos de aplicação", async () => {
    const fetcher = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          items: [],
        }),
        { status: 200 },
      ),
    );
    const client = new GoogleCalendarClient(fetcher);

    await expect(
      client.listEvents("access-token", "primary", {
        start: "2026-07-20T12:30:00.000Z",
        end: "2026-07-26T12:30:00.000Z",
      }),
    ).resolves.toEqual([]);

    const url = fetcher.mock.calls[0]?.[0] as URL;
    expect(url.searchParams.get("timeMin")).toBe("2026-07-19T23:00:00.000Z");
    expect(url.searchParams.get("timeMax")).toBe("2026-07-26T23:00:00.000Z");
  });

  test("transforma janelas inválidas em erro de calendário", async () => {
    const fetcher = vi.fn();
    const client = new GoogleCalendarClient(fetcher);

    await expect(
      client.listEvents("access-token", "primary", {
        start: "invalid-date",
        end: "2026-07-26",
      }),
    ).rejects.toThrow("Não foi possível carregar os calendários Google.");
    expect(fetcher).not.toHaveBeenCalled();
  });

  test("cria mirrors determinísticos sem convidados", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(new Response(null, { status: 404 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: "vouga1" }), { status: 200 }));
    const client = new GoogleCalendarClient(fetcher);

    await client.upsertEvent("access-token", "primary", "vouga1", {
      allDay: false,
      colorId: null,
      description: "Propósito\nAlinhar",
      end: "2026-07-20T10:00:00.000Z",
      meetingId: "meeting-1",
      meetingKind: "meeting",
      start: "2026-07-20T09:00:00.000Z",
      title: "Partner meeting",
    });

    expect(fetcher).toHaveBeenCalledTimes(2);
    const inserted = JSON.parse(fetcher.mock.calls[1][1]?.body as string);
    expect(inserted.attendees).toEqual([]);
    expect(inserted.summary).toBe("Partner meeting");
    expect(inserted.start).toEqual({
      dateTime: "2026-07-20T09:00:00.000Z",
      timeZone: "Europe/Lisbon",
    });
    expect(inserted.extendedProperties.private.vouga_os_meeting_id).toBe("meeting-1");
  });

  test("cria Vacation all-day com fim exclusivo e cor Google", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(new Response(null, { status: 404 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: "vouga2" }), { status: 200 }));
    const client = new GoogleCalendarClient(fetcher);

    await client.upsertEvent("access-token", "primary", "vouga2", {
      allDay: true,
      colorId: "10",
      description: "",
      end: "2026-07-25T23:00:00.000Z",
      meetingId: "vacation-1",
      meetingKind: "vacation",
      start: "2026-07-19T23:00:00.000Z",
      title: "Vacation · Miguel",
    });

    const inserted = JSON.parse(fetcher.mock.calls[1][1]?.body as string);
    expect(inserted.start).toEqual({ date: "2026-07-20" });
    expect(inserted.end).toEqual({ date: "2026-07-26" });
    expect(inserted.colorId).toBe("10");
    expect(inserted.attendees).toEqual([]);
  });
});
