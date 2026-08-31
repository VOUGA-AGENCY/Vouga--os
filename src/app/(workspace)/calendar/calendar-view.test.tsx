import { readFileSync } from "node:fs";
import { join } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import type { CalendarProjection } from "@/projections/calendar/calendar";

import { CalendarSurface } from "./calendar-view";

const projection: CalendarProjection = {
  entries: [
    {
      allDay: false,
      context: [],
      end: "2026-07-24T10:00:00.000Z",
      entryKey: "meeting:one",
      href: "/meetings/one",
      isCancelled: false,
      isOverdue: false,
      owner: { displayName: "Miguel", memberId: "member-one" },
      sourceId: "one",
      sourceLabel: "Meeting",
      sourceStatus: { label: "Planeada", value: "planned" },
      sourceType: "meeting",
      start: "2026-07-24T09:00:00.000Z",
      temporalBasis: "scheduled",
      temporalKind: "timed-interval",
      title: "Founder sync",
      tone: null,
    },
  ],
  isPartial: false,
  meetings: [],
  overflow: false,
  overdueTasks: [],
  owners: [],
  range: { end: "2026-08-02", start: "2026-06-29", timezone: "Europe/Lisbon" },
  sourceStates: {
    google: "empty",
    meeting: "ready",
    milestone: "empty",
    task: "empty",
  },
};

describe("CalendarSurface month composition", () => {
  it("keeps the selected day in the URL and renders its agenda from the projection", () => {
    const markup = renderToStaticMarkup(
      <CalendarSurface
        anchor="2026-07-24"
        filters={{ history: false, owner: "", sourceType: "" }}
        projection={projection}
        selectedDate="2026-07-24"
        today="2026-07-24"
        view="month"
      />,
    );

    expect(markup).toContain("calendar-month-layout");
    expect(markup).toContain("calendar-mobile-month");
    expect(markup).toContain("calendar-grid-navigation");
    expect(markup).toContain("julho de 2026");
    expect(markup).toContain("Founder sync");
    expect(markup).toContain("day=2026-07-24");
    expect(markup).toContain("Compromissos de 24 de julho de 2026");
    expect(markup).not.toContain(">Agenda<");
    expect(markup).not.toContain("calendar-filter-menu");
    expect(markup).not.toContain("calendar-today");
    expect(markup).not.toContain("calendar-mobile-period-controls");
  });

  it("keeps the desktop toolbar compact and the legacy period controls mobile-only", () => {
    const css = readFileSync(join(process.cwd(), "src/app/globals.css"), "utf8");

    expect(css).toMatch(/\.calendar-view-tabs\s*\{[^}]*grid-template-columns:\s*repeat\(2, auto\)[^}]*width:\s*fit-content/);
    expect(css).toMatch(/\.calendar-desktop-surface\s*\{[^}]*border:/);
  });
});
