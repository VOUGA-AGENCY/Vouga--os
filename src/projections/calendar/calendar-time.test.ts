import { describe, expect, it } from "vitest";

import {
  addDays,
  addMonths,
  dateKeyInLisbon,
  entryOccursOn,
  lisbonLocalTimeToIso,
  rangeForView,
  startOfWeek,
} from "./calendar-time";

describe("calendar time", () => {
  it("starts the week on Monday", () => {
    expect(startOfWeek("2026-07-17")).toBe("2026-07-13");
    expect(startOfWeek("2026-07-19")).toBe("2026-07-13");
  });

  it("builds week, agenda and month windows", () => {
    expect(rangeForView("week", "2026-07-17")).toEqual({
      start: "2026-07-13",
      end: "2026-07-19",
    });
    expect(rangeForView("agenda", "2026-07-17")).toEqual({
      start: "2026-07-17",
      end: "2026-08-15",
    });
    expect(rangeForView("month", "2026-07-17")).toEqual({
      start: "2026-06-29",
      end: "2026-08-02",
    });
  });

  it("keeps month anchors on a valid day", () => {
    expect(addMonths("2026-01-31", 1)).toBe("2026-02-28");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
  });

  it("uses Europe/Lisbon for instants", () => {
    expect(dateKeyInLisbon("2026-03-29T23:30:00.000Z")).toBe("2026-03-30");
    expect(lisbonLocalTimeToIso("2026-07-20", 9, 30)).toBe("2026-07-20T08:30:00.000Z");
    expect(lisbonLocalTimeToIso("2026-01-20", 9, 30)).toBe("2026-01-20T09:30:00.000Z");
  });

  it("treats Sprint end dates as inclusive", () => {
    const sprint = { start: "2026-07-13", end: "2026-07-19", allDay: true };
    expect(entryOccursOn(sprint, "2026-07-19")).toBe(true);
    expect(entryOccursOn(sprint, "2026-07-20")).toBe(false);
  });
});
