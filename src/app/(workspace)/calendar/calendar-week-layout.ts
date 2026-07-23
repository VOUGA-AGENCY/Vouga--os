import type { CalendarEntry } from "@/projections/calendar/calendar";
import { dateKeyInLisbon } from "@/projections/calendar/calendar-time";

export type CalendarWeekPlacement = Readonly<{
  column: number;
  columnCount: number;
  compact: boolean;
  entry: CalendarEntry;
  height: number;
  top: number;
}>;

export function layoutTimedEntries(
  entries: readonly CalendarEntry[],
  day: string,
  hourHeight = 56,
): CalendarWeekPlacement[] {
  const intervals = entries
    .map((entry) => ({ entry, ...intervalMinutes(entry, day) }))
    .sort((left, right) => left.start - right.start || left.end - right.end);
  const placements: CalendarWeekPlacement[] = [];
  let cluster: typeof intervals = [];
  let clusterEnd = -1;

  function flush() {
    if (!cluster.length) return;
    const columnEnds: number[] = [];
    const assigned = cluster.map((interval) => {
      let column = columnEnds.findIndex((end) => end <= interval.start);
      if (column < 0) column = columnEnds.length;
      columnEnds[column] = interval.end;
      return { ...interval, column };
    });
    const columnCount = Math.max(1, columnEnds.length);
    for (const interval of assigned) {
      const top = (interval.start / 60) * hourHeight;
      const height = Math.max(20, ((interval.end - interval.start) / 60) * hourHeight);
      placements.push({
        column: interval.column,
        columnCount,
        compact: height < 38,
        entry: interval.entry,
        height,
        top,
      });
    }
    cluster = [];
    clusterEnd = -1;
  }

  for (const interval of intervals) {
    if (cluster.length && interval.start >= clusterEnd) flush();
    cluster.push(interval);
    clusterEnd = Math.max(clusterEnd, interval.end);
  }
  flush();
  return placements;
}

function intervalMinutes(entry: CalendarEntry, day: string) {
  const startDay = dateKeyInLisbon(entry.start);
  const endDay = entry.end ? dateKeyInLisbon(entry.end) : startDay;
  const start = startDay < day ? 0 : minuteOfDay(entry.start);
  const rawEnd = !entry.end ? start + 30 : endDay > day ? 1440 : minuteOfDay(entry.end);
  return { start, end: Math.max(rawEnd, start + 30) };
}

function minuteOfDay(value: string) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    hourCycle: "h23",
    minute: "2-digit",
    timeZone: "Europe/Lisbon",
  }).formatToParts(new Date(value));
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((candidate) => candidate.type === type)?.value);
  return part("hour") * 60 + part("minute");
}
