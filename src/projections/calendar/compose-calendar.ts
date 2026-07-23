import { MEETING_STATUS_LABELS } from "@/domain/meetings/meeting";
import type { MeetingListItem } from "@/projections/meetings/meeting-read-model";
import type { SprintListItem } from "@/projections/sprints/sprint-read-model";
import type { TaskListItem } from "@/projections/tasks/task-read-model";
import type { GoogleCalendarEvent } from "@/application/google/contracts";
import type { GoogleEventArtifact } from "@/domain/google/google-event-artifact";

import type {
  CalendarEntry,
  CalendarFilters,
  CalendarMeetingSummary,
  CalendarProjection,
  CalendarSourceState,
  CalendarSourceType,
} from "./calendar";
import { dateKeyInLisbon, daysBetween, entryDateKey } from "./calendar-time";

const MAX_RANGE_DAYS = 62;
const MAX_ENTRIES = 500;

export type CalendarSources = Readonly<{
  meetings(): Promise<readonly MeetingListItem[]>;
  tasks(): Promise<readonly TaskListItem[]>;
  sprints(): Promise<readonly SprintListItem[]>;
  googleEvents(): Promise<readonly GoogleCalendarEvent[]>;
  googleArtifacts(): Promise<readonly GoogleEventArtifact[]>;
}>;

export async function composeCalendar(
  sources: CalendarSources,
  range: Readonly<{ start: string; end: string }>,
  nowIso: string,
  filters: CalendarFilters = {},
): Promise<CalendarProjection> {
  if (range.start > range.end || daysBetween(range.start, range.end) > MAX_RANGE_DAYS) {
    throw new Error("A janela do Calendar não é válida.");
  }

  const results = await Promise.allSettled([
    sources.meetings(),
    sources.tasks(),
    sources.sprints(),
    sources.googleEvents(),
    sources.googleArtifacts(),
  ] as const);
  const sourceStates: Record<CalendarSourceType, CalendarSourceState> = {
    meeting: sourceState(results[0]),
    task: sourceState(results[1]),
    milestone: sourceState(results[2]),
    google:
      results[3].status === "rejected" || results[4].status === "rejected"
        ? "error"
        : results[3].value.length
          ? "ready"
          : "empty",
  };

  const meetings = value(results[0]);
  const googleEvents = value(results[3]);
  const googleArtifacts = value(results[4]);

  const allEntries = [
    ...meetingEntries(meetings, range, filters.includeHistory ?? false),
    ...googleEventEntries(googleEvents, range),
  ];
  const owners = [
    ...new Map(
      allEntries.flatMap((entry) =>
        entry.owner ? [[entry.owner.memberId, entry.owner] as const] : [],
      ),
    ).values(),
  ].sort((left, right) => left.displayName.localeCompare(right.displayName, "pt-PT"));
  const filtered = allEntries
    .filter((entry) => matchesFilters(entry, filters))
    .sort(compareEntries);
  const overdueTasks: CalendarEntry[] = [];
  const overflow = filtered.length > MAX_ENTRIES;

  return {
    range: { ...range, timezone: "Europe/Lisbon" },
    entries: filtered.slice(0, MAX_ENTRIES),
    meetings: [
      ...meetingSummaries(meetings, range, nowIso, filters),
      ...googleEventSummaries(googleEvents, googleArtifacts, range, nowIso, filters),
    ].sort((left, right) => left.startsAt.localeCompare(right.startsAt)),
    overdueTasks,
    owners,
    sourceStates,
    isPartial: Object.values(sourceStates).includes("error"),
    overflow,
  };
}

function googleEventEntries(
  events: readonly GoogleCalendarEvent[],
  range: { start: string; end: string },
): CalendarEntry[] {
  return events.flatMap((event) => {
    const start = event.allDay ? event.start : dateKeyInLisbon(event.start);
    const end = event.allDay ? event.end : dateKeyInLisbon(event.end);
    if (end < range.start || start > range.end) return [];
    return [
      {
        entryKey: `google:${event.calendarId}:${event.id}`,
        sourceType: "google" as const,
        sourceId: event.id,
        sourceLabel: "Google" as const,
        title: event.title,
        start: event.start,
        end: event.end,
        allDay: event.allDay,
        temporalKind: event.allDay ? ("all-day-interval" as const) : ("timed-interval" as const),
        temporalBasis: "confirmed" as const,
        sourceStatus: {
          value: event.status,
          label: event.status === "tentative" ? "Provisório" : "Confirmado",
        },
        owner: null,
        context: [{ kind: "google-calendar" as const, label: "Google Calendar" }],
        href: `/calendar/google-event/${encodeURIComponent(event.id)}?calendar=${encodeURIComponent(event.calendarId)}`,
        isOverdue: false,
        isCancelled: false,
        tone: null,
      },
    ];
  });
}

function googleEventSummaries(
  events: readonly GoogleCalendarEvent[],
  artifacts: readonly GoogleEventArtifact[],
  range: { start: string; end: string },
  nowIso: string,
  filters: CalendarFilters,
): CalendarMeetingSummary[] {
  if (filters.sourceTypes?.length && !filters.sourceTypes.includes("google")) return [];
  const byIdentity = new Map(
    artifacts.map((artifact) => [`${artifact.calendarId}:${artifact.googleEventId}`, artifact]),
  );
  return events.flatMap((event) => {
    const startDay = event.allDay ? event.start : dateKeyInLisbon(event.start);
    const endDay = event.allDay ? event.end : dateKeyInLisbon(event.end);
    if (endDay < range.start || startDay > range.end) return [];
    const artifact = byIdentity.get(`${event.calendarId}:${event.id}`);
    if (filters.ownerMemberId && artifact?.ownerMemberId !== filters.ownerMemberId) return [];
    const ended = event.end < nowIso;
    const missingOutput = artifact?.classification === "meeting" && ended && !artifact.output;
    const closed = ended && (artifact?.classification !== "meeting" || Boolean(artifact.output));
    return [
      {
        id: `google:${event.calendarId}:${event.id}`,
        kind: artifact?.classification ?? null,
        title: event.title,
        status: missingOutput ? "needs_closure" : closed ? "closed" : "planned",
        statusLabel: missingOutput ? "Sem output" : closed ? "Terminado" : "Planeado",
        startsAt: event.start,
        endsAt: event.end,
        ownerDisplayName: "Google Calendar",
        companyNames: [],
        href: `/calendar/google-event/${encodeURIComponent(event.id)}?calendar=${encodeURIComponent(event.calendarId)}`,
        isMissingOutput: missingOutput,
        isLive: !event.allDay && event.start <= nowIso && event.end >= nowIso,
        isClosed: closed,
        isCancelled: false,
      },
    ];
  });
}

function meetingEntries(
  meetings: readonly MeetingListItem[],
  range: { start: string; end: string },
  includeHistory: boolean,
): CalendarEntry[] {
  return meetings.flatMap((meeting) => {
    if (["closed", "cancelled"].includes(meeting.status) && !includeHistory) return [];
    const allDay = meeting.kind === "vacation";
    const start = dateKeyInLisbon(meeting.startsAt);
    const end = allDay ? inclusiveEndDateKey(meeting.endsAt) : dateKeyInLisbon(meeting.endsAt);
    if (end < range.start || start > range.end) return [];
    const participant = meeting.participantMembers[0] ?? null;
    return [
      {
        entryKey: `meeting:${meeting.id}:scheduled:${meeting.startsAt}`,
        sourceType: "meeting",
        sourceId: meeting.id,
        sourceLabel:
          meeting.kind === "vacation" ? "Vacation" : meeting.kind === "event" ? "Event" : "Meeting",
        title: meeting.title,
        start: allDay ? start : meeting.startsAt,
        end: allDay ? end : meeting.endsAt,
        allDay,
        temporalKind: allDay ? "all-day-interval" : "timed-interval",
        temporalBasis:
          meeting.status === "closed" || meeting.status === "cancelled"
            ? "historical"
            : "scheduled",
        sourceStatus: { value: meeting.status, label: statusLabelForMeeting(meeting) },
        owner: participant
          ? { memberId: participant.memberId, displayName: participant.displayName }
          : meeting.closerMemberId && meeting.closerDisplayName
            ? { memberId: meeting.closerMemberId, displayName: meeting.closerDisplayName }
            : null,
        context: meeting.companyNames.map((label) => ({ kind: "company" as const, label })),
        href: `/meetings/${meeting.id}`,
        isOverdue: meeting.status === "needs_closure",
        isCancelled: meeting.status === "cancelled",
        tone: allDay ? meeting.calendarTone : null,
      },
    ];
  });
}

function meetingSummaries(
  meetings: readonly MeetingListItem[],
  range: { start: string; end: string },
  nowIso: string,
  filters: CalendarFilters,
): CalendarMeetingSummary[] {
  if (filters.sourceTypes?.length && !filters.sourceTypes.includes("meeting")) return [];
  return meetings
    .filter((meeting) => {
      if (meeting.kind === "vacation") return false;
      if (filters.ownerMemberId && meeting.closerMemberId !== filters.ownerMemberId) return false;
      const start = dateKeyInLisbon(meeting.startsAt);
      const end = dateKeyInLisbon(meeting.endsAt);
      return end >= range.start && start <= range.end;
    })
    .map((meeting) => ({
      id: meeting.id,
      kind: meeting.kind,
      title: meeting.title,
      status: meeting.status,
      statusLabel: statusLabelForMeeting(meeting),
      startsAt: meeting.startsAt,
      endsAt: meeting.endsAt,
      ownerDisplayName:
        meeting.participantMembers[0]?.displayName ?? meeting.closerDisplayName ?? "Participantes",
      companyNames: meeting.companyNames,
      href: `/meetings/${meeting.id}`,
      isMissingOutput: meeting.kind === "meeting" && meeting.status === "needs_closure",
      isLive:
        !["closed", "cancelled", "needs_closure"].includes(meeting.status) &&
        Date.parse(meeting.startsAt) <= Date.parse(nowIso) &&
        Date.parse(meeting.endsAt) >= Date.parse(nowIso),
      isClosed: meeting.status === "closed",
      isCancelled: meeting.status === "cancelled",
    }))
    .sort((left, right) => left.startsAt.localeCompare(right.startsAt));
}

function statusLabelForMeeting(meeting: MeetingListItem): string {
  if (meeting.kind === "vacation" && meeting.status === "closed") return "Terminadas";
  if (meeting.kind === "vacation") return "Agendadas";
  if (meeting.kind === "event" && meeting.status === "closed") return "Terminado";
  return MEETING_STATUS_LABELS[meeting.status];
}

function inclusiveEndDateKey(endsAt: string): string {
  const date = new Date(endsAt);
  date.setTime(date.getTime() - 1);
  return dateKeyInLisbon(date.toISOString());
}

function matchesFilters(entry: CalendarEntry, filters: CalendarFilters) {
  if (filters.sourceTypes?.length && !filters.sourceTypes.includes(entry.sourceType)) return false;
  return !filters.ownerMemberId || entry.owner?.memberId === filters.ownerMemberId;
}

function compareEntries(left: CalendarEntry, right: CalendarEntry) {
  const leftDay = entryDateKey(left.start, left.allDay);
  const rightDay = entryDateKey(right.start, right.allDay);
  if (leftDay !== rightDay) return leftDay.localeCompare(rightDay);
  if (left.allDay !== right.allDay) return left.allDay ? -1 : 1;
  if (left.isOverdue !== right.isOverdue) return left.isOverdue ? -1 : 1;
  return left.start.localeCompare(right.start) || left.title.localeCompare(right.title, "pt-PT");
}

function value<T>(result: PromiseSettledResult<readonly T[]>): readonly T[] {
  return result.status === "fulfilled" ? result.value : [];
}

function sourceState<T>(result: PromiseSettledResult<readonly T[]>): CalendarSourceState {
  return result.status === "rejected" ? "error" : result.value.length ? "ready" : "empty";
}
