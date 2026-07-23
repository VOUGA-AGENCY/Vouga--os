import { describe, expect, it } from "vitest";

import type { MeetingListItem } from "@/projections/meetings/meeting-read-model";
import type { SprintListItem } from "@/projections/sprints/sprint-read-model";
import type { TaskListItem } from "@/projections/tasks/task-read-model";

import { composeCalendar } from "./compose-calendar";

const meeting: MeetingListItem = {
  id: "meeting-1",
  kind: "meeting",
  calendarTone: null,
  title: "Revisão semanal",
  purpose: "Coordenar trabalho",
  status: "planned",
  startsAt: "2026-07-17T09:00:00.000Z",
  endsAt: "2026-07-17T10:00:00.000Z",
  closerMemberId: "member-1",
  closerDisplayName: "Miguel",
  companyNames: ["Alder"],
  participantMembers: [{ memberId: "member-1", displayName: "Miguel" }],
  updatedAt: "2026-07-16T10:00:00.000Z",
};

const task: TaskListItem = {
  id: "task-1",
  title: "Fechar proposta",
  expectedResult: "Proposta pronta",
  purpose: "work",
  status: "blocked",
  ownerMemberId: "member-1",
  ownerDisplayName: "Miguel",
  dueAt: "2026-07-16T17:00:00.000Z",
  blockedReason: "Dependência externa",
  blockedNextMove: "Obter resposta",
  originLabel: "Captura direta",
  originMeetingId: null,
  originDecisionId: null,
  companyIds: ["company-1"],
  companyNames: ["Alder"],
  meetingIds: [],
  meetingTitles: [],
  decisionIds: [],
  decisionTitles: [],
  updatedAt: "2026-07-16T10:00:00.000Z",
};

const sprint: SprintListItem = {
  id: "sprint-1",
  name: "Pilot readiness",
  intendedResult: "Piloto pronto",
  status: "active",
  ownerMemberId: "member-2",
  ownerDisplayName: "Inês",
  startsOn: "2026-07-13",
  endsOn: "2026-07-24",
  taskCount: 4,
  completedTaskCount: 1,
  blockedTaskCount: 1,
};

const sources = {
  googleArtifacts: async () => [],
  googleEvents: async () => [],
  meetings: async () => [meeting],
  tasks: async () => [task],
  sprints: async () => [sprint],
};

describe("composeCalendar", () => {
  it("preserves source status labels, owners and typed context", async () => {
    const result = await composeCalendar(
      sources,
      { start: "2026-07-13", end: "2026-07-19" },
      "2026-07-17T12:00:00.000Z",
    );
    const meetingEntry = result.entries.find((entry) => entry.sourceType === "meeting");
    expect(meetingEntry?.sourceStatus).toEqual({ value: "planned", label: "Planeada" });
    expect(meetingEntry?.owner).toEqual({ memberId: "member-1", displayName: "Miguel" });
    expect(meetingEntry?.context).toEqual([{ kind: "company", label: "Alder" }]);
  });

  it("separa Meetings sem output de Events terminados na síntese inferior", async () => {
    const pastMeeting: MeetingListItem = {
      ...meeting,
      id: "meeting-output",
      status: "needs_closure",
      startsAt: "2026-07-14T09:00:00.000Z",
      endsAt: "2026-07-14T10:00:00.000Z",
    };
    const pastEvent: MeetingListItem = {
      ...meeting,
      id: "event-1",
      kind: "event",
      status: "closed",
      startsAt: "2026-07-15T09:00:00.000Z",
      endsAt: "2026-07-15T10:00:00.000Z",
    };
    const result = await composeCalendar(
      { ...sources, meetings: async () => [pastMeeting, pastEvent] },
      { start: "2026-07-13", end: "2026-07-19" },
      "2026-07-17T12:00:00.000Z",
    );
    expect(result.meetings.find((item) => item.id === "meeting-output")).toMatchObject({
      isMissingOutput: true,
      statusLabel: "Sem output",
    });
    expect(result.meetings.find((item) => item.id === "event-1")).toMatchObject({
      isClosed: true,
      isMissingOutput: false,
      statusLabel: "Terminado",
    });
  });

  it("não projeta Sprints no Calendar normal", async () => {
    const result = await composeCalendar(
      sources,
      { start: "2026-07-13", end: "2026-07-19" },
      "2026-07-17T12:00:00.000Z",
    );
    expect(result.entries.some((entry) => entry.sourceType === "milestone")).toBe(false);
  });

  it("não projeta Tasks nem deadlines no Calendar normal", async () => {
    const result = await composeCalendar(
      sources,
      { start: "2026-07-17", end: "2026-07-23" },
      "2026-07-17T12:00:00.000Z",
    );
    expect(result.overdueTasks).toEqual([]);
    expect(result.entries.some((entry) => entry.sourceId === task.id)).toBe(false);
  });

  it("projeta Vacation como all-day com o tom escolhido", async () => {
    const vacation: MeetingListItem = {
      ...meeting,
      id: "vacation-1",
      kind: "vacation",
      calendarTone: "green",
      title: "Vacation · Miguel",
      startsAt: "2026-07-14T23:00:00.000Z",
      endsAt: "2026-07-18T23:00:00.000Z",
    };
    const result = await composeCalendar(
      { ...sources, meetings: async () => [vacation] },
      { start: "2026-07-13", end: "2026-07-19" },
      "2026-07-17T12:00:00.000Z",
    );
    expect(result.entries[0]).toMatchObject({
      allDay: true,
      sourceLabel: "Vacation",
      title: "Vacation · Miguel",
      tone: "green",
    });
  });

  it("filters by source and stable Member ID", async () => {
    const result = await composeCalendar(
      sources,
      { start: "2026-07-13", end: "2026-07-19" },
      "2026-07-17T12:00:00.000Z",
      { sourceTypes: ["meeting"], ownerMemberId: "member-1" },
    );
    expect(result.entries.map((entry) => entry.sourceType)).toEqual(["meeting"]);
    expect(result.owners.map((owner) => owner.memberId)).toEqual(["member-1"]);
  });

  it("surfaces partial source failures", async () => {
    const result = await composeCalendar(
      {
        ...sources,
        sprints: async () => {
          throw new Error("unavailable");
        },
      },
      { start: "2026-07-13", end: "2026-07-19" },
      "2026-07-17T12:00:00.000Z",
    );
    expect(result.isPartial).toBe(true);
    expect(result.sourceStates.milestone).toBe("error");
    expect(result.entries.some((entry) => entry.sourceType === "meeting")).toBe(true);
  });

  it("inclui Google Events na síntese e só exige output após classificação humana", async () => {
    const googleEvent = {
      allDay: false,
      calendarId: "primary",
      description: null,
      end: "2026-07-14T10:00:00.000Z",
      eventType: "default",
      htmlLink: "https://calendar.google.com/event?eid=google-1",
      id: "google-1",
      location: null,
      start: "2026-07-14T09:00:00.000Z",
      status: "confirmed" as const,
      title: "Google partner call",
      transparency: "opaque",
    };
    const result = await composeCalendar(
      {
        ...sources,
        googleArtifacts: async () => [
          {
            calendarId: "primary",
            classification: "meeting" as const,
            companyIds: [],
            contactIds: [],
            googleEventId: "google-1",
            memberId: "member-1",
            notes: null,
            output: null,
            outputAt: null,
            ownerMemberId: "member-1",
            purpose: null,
            participantMemberIds: ["member-1"],
            taskIds: [],
          },
        ],
        googleEvents: async () => [googleEvent],
      },
      { start: "2026-07-13", end: "2026-07-19" },
      "2026-07-17T12:00:00.000Z",
    );
    expect(result.meetings.find((item) => item.title === googleEvent.title)).toMatchObject({
      isMissingOutput: true,
      kind: "meeting",
      statusLabel: "Sem output",
    });
  });
});
