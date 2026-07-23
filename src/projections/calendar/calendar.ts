export const CALENDAR_SOURCE_TYPES = ["meeting", "task", "milestone", "google"] as const;
export type CalendarSourceType = (typeof CALENDAR_SOURCE_TYPES)[number];

export type CalendarTemporalKind =
  | "timed-interval"
  | "deadline"
  | "date"
  | "all-day-interval"
  | "recurring-occurrence"
  | "lifecycle-marker";

export type CalendarTemporalBasis =
  "scheduled" | "expected" | "confirmed" | "derived" | "historical";

export type CalendarContextKind =
  "company" | "sprint" | "meeting" | "decision" | "roadmap" | "google-calendar";

export type CalendarEntry = Readonly<{
  entryKey: string;
  sourceType: CalendarSourceType;
  sourceId: string;
  sourceLabel: "Meeting" | "Event" | "Vacation" | "Task" | "Milestone" | "Google";
  title: string;
  start: string;
  end: string | null;
  allDay: boolean;
  temporalKind: CalendarTemporalKind;
  temporalBasis: CalendarTemporalBasis;
  sourceStatus: Readonly<{ value: string; label: string }>;
  owner: Readonly<{ memberId: string; displayName: string }> | null;
  context: readonly Readonly<{ kind: CalendarContextKind; label: string }>[];
  href: string;
  isOverdue: boolean;
  isCancelled: boolean;
  tone: import("@/domain/meetings/meeting").VacationTone | null;
}>;

export type CalendarMeetingSummary = Readonly<{
  id: string;
  kind: "meeting" | "event" | "vacation" | null;
  title: string;
  status: string;
  statusLabel: string;
  startsAt: string;
  endsAt: string;
  ownerDisplayName: string;
  companyNames: readonly string[];
  href: string;
  isMissingOutput: boolean;
  isLive: boolean;
  isClosed: boolean;
  isCancelled: boolean;
}>;

export type CalendarSourceState = "ready" | "empty" | "error";

export type CalendarOwnerOption = Readonly<{ memberId: string; displayName: string }>;

export type CalendarProjection = Readonly<{
  range: Readonly<{ start: string; end: string; timezone: "Europe/Lisbon" }>;
  entries: readonly CalendarEntry[];
  meetings: readonly CalendarMeetingSummary[];
  overdueTasks: readonly CalendarEntry[];
  owners: readonly CalendarOwnerOption[];
  sourceStates: Readonly<Record<CalendarSourceType, CalendarSourceState>>;
  isPartial: boolean;
  overflow: boolean;
}>;

export type CalendarFilters = Readonly<{
  sourceTypes?: readonly CalendarSourceType[];
  ownerMemberId?: string | null;
  includeHistory?: boolean;
}>;
