import { loadCalendar } from "@/foundation/composition/calendar";
import { CALENDAR_SOURCE_TYPES, type CalendarSourceType } from "@/projections/calendar/calendar";
import {
  dateKeyInLisbon,
  isDateKey,
  rangeForView,
  type CalendarView,
} from "@/projections/calendar/calendar-time";

import { CalendarSurface } from "./calendar-view";

const VIEWS: CalendarView[] = ["week", "month"];

type CalendarSearchParams = {
  date?: string;
  day?: string;
  history?: string;
  owner?: string;
  type?: string;
  view?: string;
};

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<CalendarSearchParams>;
}) {
  const params = await searchParams;
  const nowIso = new Date().toISOString();
  const today = dateKeyInLisbon(nowIso);
  const view = VIEWS.includes(params.view as CalendarView) ? (params.view as CalendarView) : "week";
  const anchor = params.date && isDateKey(params.date) ? params.date : today;
  const requestedDate = params.day && isDateKey(params.day) ? params.day : anchor;
  const sourceType = CALENDAR_SOURCE_TYPES.includes(params.type as CalendarSourceType)
    ? (params.type as CalendarSourceType)
    : null;
  const range = rangeForView(view, anchor);
  const selectedDate =
    requestedDate >= range.start && requestedDate <= range.end ? requestedDate : anchor;
  const projection = await loadCalendar(range, nowIso, {
    sourceTypes: sourceType ? [sourceType] : undefined,
    ownerMemberId: params.owner || null,
    includeHistory: params.history === "1",
  });

  return (
    <CalendarSurface
      anchor={anchor}
      filters={{
        history: params.history === "1",
        owner: params.owner ?? "",
        sourceType: sourceType ?? "",
      }}
      projection={projection}
      selectedDate={selectedDate}
      today={today}
      view={view}
    />
  );
}
