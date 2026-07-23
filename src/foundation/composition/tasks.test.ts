import { describe, expect, it } from "vitest";

import { isTaskOriginCandidate } from "./tasks";

describe("Task Google event options", () => {
  it("exclui feriados e eventos livres da origem de Task", () => {
    expect(
      isTaskOriginCandidate({
        allDay: false,
        eventType: "default",
        transparency: "opaque",
      }),
    ).toBe(true);
    expect(
      isTaskOriginCandidate({
        allDay: true,
        eventType: "default",
        transparency: "opaque",
      }),
    ).toBe(false);
    expect(
      isTaskOriginCandidate({
        allDay: false,
        eventType: "holiday",
        transparency: "opaque",
      }),
    ).toBe(false);
    expect(
      isTaskOriginCandidate({
        allDay: false,
        eventType: "default",
        transparency: "transparent",
      }),
    ).toBe(false);
  });
});
