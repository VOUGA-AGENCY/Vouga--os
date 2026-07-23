const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const DAY = 86_400_000;

export type CalendarView = "week" | "month" | "agenda";

export function isDateKey(value: string): boolean {
  if (!DATE_PATTERN.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

export function dateKeyInLisbon(value: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Lisbon",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));
}

export function addDays(value: string, days: number): string {
  const date = new Date(`${value}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function addMonths(value: string, months: number): string {
  const source = new Date(`${value}T00:00:00.000Z`);
  const target = new Date(Date.UTC(source.getUTCFullYear(), source.getUTCMonth() + months, 1));
  const lastDay = new Date(
    Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0),
  ).getUTCDate();
  target.setUTCDate(Math.min(source.getUTCDate(), lastDay));
  return target.toISOString().slice(0, 10);
}

export function startOfWeek(value: string): string {
  const date = new Date(`${value}T00:00:00.000Z`);
  const weekday = date.getUTCDay();
  return addDays(value, weekday === 0 ? -6 : 1 - weekday);
}

export function endOfMonth(value: string): string {
  const date = new Date(`${value}T00:00:00.000Z`);
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0))
    .toISOString()
    .slice(0, 10);
}

export function rangeForView(view: CalendarView, anchor: string) {
  if (view === "week") {
    const start = startOfWeek(anchor);
    return { start, end: addDays(start, 6) } as const;
  }
  if (view === "agenda") return { start: anchor, end: addDays(anchor, 29) } as const;
  const monthStart = `${anchor.slice(0, 7)}-01`;
  const start = startOfWeek(monthStart);
  const monthEnd = endOfMonth(anchor);
  const endWeekStart = startOfWeek(monthEnd);
  return { start, end: addDays(endWeekStart, 6) } as const;
}

export function moveAnchor(view: CalendarView, anchor: string, direction: -1 | 1): string {
  if (view === "week") return addDays(anchor, direction * 7);
  if (view === "agenda") return addDays(anchor, direction * 30);
  return addMonths(anchor, direction);
}

export function enumerateDays(start: string, end: string): string[] {
  const days: string[] = [];
  for (let current = start; current <= end; current = addDays(current, 1)) days.push(current);
  return days;
}

export function entryDateKey(value: string, allDay: boolean): string {
  return allDay ? value.slice(0, 10) : dateKeyInLisbon(value);
}

export function entryOccursOn(
  entry: { start: string; end: string | null; allDay: boolean },
  day: string,
): boolean {
  const start = entryDateKey(entry.start, entry.allDay);
  const end = entry.end ? entryDateKey(entry.end, entry.allDay) : start;
  return day >= start && day <= end;
}

export function daysBetween(start: string, end: string): number {
  return Math.round(
    (new Date(`${end}T00:00:00.000Z`).getTime() -
      new Date(`${start}T00:00:00.000Z`).getTime()) /
      DAY,
  );
}

export function lisbonLocalTimeToIso(dateKey: string, hour: number, minute: number): string {
  const [year, month, day] = dateKey.split("-").map(Number);
  const targetWallTime = Date.UTC(year, month - 1, day, hour, minute);
  let candidate = targetWallTime;

  for (let iteration = 0; iteration < 4; iteration += 1) {
    const parts = new Intl.DateTimeFormat("en-CA", {
      day: "2-digit",
      hour: "2-digit",
      hourCycle: "h23",
      minute: "2-digit",
      month: "2-digit",
      timeZone: "Europe/Lisbon",
      year: "numeric",
    }).formatToParts(new Date(candidate));
    const value = (type: Intl.DateTimeFormatPartTypes) =>
      Number(parts.find((part) => part.type === type)?.value);
    const representedWallTime = Date.UTC(
      value("year"),
      value("month") - 1,
      value("day"),
      value("hour"),
      value("minute"),
    );
    const correction = targetWallTime - representedWallTime;
    candidate += correction;
    if (!correction) break;
  }

  return new Date(candidate).toISOString();
}
