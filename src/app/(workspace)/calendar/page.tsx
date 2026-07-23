import { headers } from "next/headers";

import { loadCalendar } from "@/foundation/composition/calendar";
import { CALENDAR_SOURCE_TYPES, type CalendarSourceType } from "@/projections/calendar/calendar";
import {
  dateKeyInLisbon,
  isDateKey,
  rangeForView,
  type CalendarView,
} from "@/projections/calendar/calendar-time";

import { CalendarSurface } from "./calendar-view";

const VIEWS: CalendarView[] = ["week", "month", "agenda"];

type CalendarSearchParams = {
  date?: string;
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
  const [params, requestHeaders] = await Promise.all([searchParams, headers()]);
  const nowIso = new Date().toISOString();
  const today = dateKeyInLisbon(nowIso);
  const userAgent = requestHeaders.get("user-agent") ?? "";
  const responsiveDefault: CalendarView = /Android|iPhone|Mobile/i.test(userAgent)
    ? "agenda"
    : "week";
  const view = VIEWS.includes(params.view as CalendarView)
    ? (params.view as CalendarView)
    : responsiveDefault;
  const anchor = params.date && isDateKey(params.date) ? params.date : today;
  const sourceType = CALENDAR_SOURCE_TYPES.includes(params.type as CalendarSourceType)
    ? (params.type as CalendarSourceType)
    : null;
  const range = rangeForView(view, anchor);
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
      today={today}
      view={view}
    />
  );
}
