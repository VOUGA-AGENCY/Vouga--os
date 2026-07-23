import { describe, expect, it } from "vitest";
import {
  cancelMeeting,
  closeMeeting,
  effectiveMeetingStatus,
  type Meeting,
  MeetingValidationError,
  validateMeetingValues,
} from "./meeting";
const meeting: Meeting = {
  id: "meeting-1",
  kind: "meeting",
  calendarTone: null,
  title: "Contexto",
  purpose: null,
  intendedResult: null,
  status: "planned",
  closerMemberId: null,
  startsAt: "2026-07-15T09:00:00Z",
  endsAt: "2026-07-15T10:00:00Z",
  agenda: null,
  notes: null,
  openQuestions: null,
  conclusion: null,
  closedAt: null,
  participants: [{ memberId: "member-1", contactId: null, externalName: null }],
  companyIds: [],
  taskIds: [],
  createdAt: "2026-07-15T08:00:00Z",
  updatedAt: "2026-07-15T08:00:00Z",
};
describe("Meeting", () => {
  it("aceita apenas o contexto mínimo e exige participante numa Meeting", () => {
    expect(
      validateMeetingValues({
        title: " Contexto ",
        startsAt: meeting.startsAt,
        endsAt: meeting.endsAt,
        participantMemberIds: ["member-1"],
        notes: " Nota ",
      }),
    ).toMatchObject({ title: "Contexto", notes: "Nota", purpose: null, closerMemberId: null });
    expect(() =>
      validateMeetingValues({
        title: "Contexto",
        startsAt: meeting.startsAt,
        endsAt: meeting.endsAt,
      }),
    ).toThrow(MeetingValidationError);
  });
  it("permite Event sem participantes e valida o intervalo", () => {
    expect(
      validateMeetingValues({
        kind: "event",
        title: "Evento",
        startsAt: meeting.startsAt,
        endsAt: meeting.endsAt,
      }).participants,
    ).toEqual([]);
    expect(() =>
      validateMeetingValues({
        kind: "event",
        title: "Evento",
        startsAt: meeting.endsAt,
        endsAt: meeting.startsAt,
      }),
    ).toThrow("posterior");
  });
  it("reduz Vacation a pessoa, intervalo all-day e cor", () => {
    expect(
      validateMeetingValues({
        kind: "vacation",
        calendarTone: "blue",
        startsAt: "2026-07-20T23:00:00.000Z",
        endsAt: "2026-07-25T23:00:00.000Z",
        participantMemberIds: ["member-1"],
        companyIds: ["company-1"],
        taskIds: ["task-1"],
        notes: "não deve persistir",
      }),
    ).toMatchObject({
      kind: "vacation",
      calendarTone: "blue",
      title: "Vacation",
      companyIds: [],
      taskIds: [],
      notes: null,
    });
    expect(() =>
      validateMeetingValues({
        kind: "vacation",
        startsAt: meeting.startsAt,
        endsAt: meeting.endsAt,
        participantMemberIds: ["member-1"],
      }),
    ).toThrow("cor");
    expect(() =>
      validateMeetingValues({
        kind: "vacation",
        calendarTone: "green",
        startsAt: meeting.startsAt,
        endsAt: meeting.endsAt,
        participantMemberIds: ["member-1", "member-2"],
      }),
    ).toThrow("uma pessoa");
  });
  it("deriva output pendente e fim automático", () => {
    expect(effectiveMeetingStatus(meeting, "2026-07-15T11:00:00Z")).toBe("needs_closure");
    expect(effectiveMeetingStatus({ ...meeting, kind: "event" }, "2026-07-15T11:00:00Z")).toBe(
      "closed",
    );
  });
  it("fecha Meeting com output e não fecha Event", () => {
    expect(closeMeeting(meeting, "Fechado", "2026-07-15T11:00:00Z")).toMatchObject({
      status: "closed",
      conclusion: "Fechado",
    });
    expect(() => closeMeeting({ ...meeting, kind: "event" }, "x", "2026-07-15T11:00:00Z")).toThrow(
      "termina automaticamente",
    );
  });
  it("cancela sem apagar", () => {
    expect(cancelMeeting(meeting).status).toBe("cancelled");
  });
});
