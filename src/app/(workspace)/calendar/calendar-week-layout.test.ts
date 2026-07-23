import { describe, expect, it } from "vitest";

import type { CalendarEntry } from "@/projections/calendar/calendar";

import { layoutTimedEntries } from "./calendar-week-layout";

function entry(id: string, start: string, end: string): CalendarEntry {
  return {
    allDay: false,
    context: [],
    end,
    entryKey: id,
    href: `/meetings/${id}`,
    isCancelled: false,
    isOverdue: false,
    owner: null,
    sourceId: id,
    sourceLabel: "Meeting",
    sourceStatus: { label: "Planeada", value: "planned" },
    sourceType: "meeting",
    start,
    temporalBasis: "scheduled",
    temporalKind: "timed-interval",
    title: id,
    tone: null,
  };
}

describe("calendar week layout", () => {
  it("divide a largura entre intervalos simultâneos", () => {
    const placements = layoutTimedEntries([
      entry("a", "2026-07-20T09:00:00.000Z", "2026-07-20T10:00:00.000Z"),
      entry("b", "2026-07-20T09:30:00.000Z", "2026-07-20T10:30:00.000Z"),
    ], "2026-07-20");
    expect(placements.map(({ column, columnCount }) => ({ column, columnCount }))).toEqual([
      { column: 0, columnCount: 2 },
      { column: 1, columnCount: 2 },
    ]);
  });

  it("recupera a largura completa depois de terminar a colisão", () => {
    const placements = layoutTimedEntries([
      entry("a", "2026-07-20T09:00:00.000Z", "2026-07-20T10:00:00.000Z"),
      entry("b", "2026-07-20T10:00:00.000Z", "2026-07-20T11:00:00.000Z"),
    ], "2026-07-20");
    expect(placements.every((placement) => placement.columnCount === 1)).toBe(true);
  });

  it("marca intervalos baixos para mostrar apenas o nome", () => {
    const [placement] = layoutTimedEntries([
      entry("short", "2026-07-20T09:00:00.000Z", "2026-07-20T09:30:00.000Z"),
    ], "2026-07-20");
    expect(placement.compact).toBe(true);
  });
});
