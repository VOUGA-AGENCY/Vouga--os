import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const seed = readFileSync(
  resolve(process.cwd(), "supabase/seed/synthetic_operating_dataset.sql"),
  "utf8",
);
const cleanup = readFileSync(
  resolve(process.cwd(), "supabase/seed/synthetic_operating_dataset_cleanup.sql"),
  "utf8",
);

describe("synthetic W004 operating dataset", () => {
  it("is separate from migrations and declares the representative volume", () => {
    expect(seed).toContain("not a migration");
    expect(seed).toContain("dataset-count: companies=7");
    expect(seed).toContain("dataset-count: meetings=12");
    expect(seed).toContain("dataset-count: tasks=24");
    expect(seed).toContain("dataset-count: decisions=9");
    expect(seed).toContain("dataset-count: sprints=4");
    expect(seed).toContain("dataset-count: roadmap_items=10");
  });

  it("reuses active members and never manufactures auth identities", () => {
    expect(seed).toContain("from public.members");
    expect(seed).toContain("where is_active = true");
    expect(seed).not.toMatch(/insert\s+into\s+auth\.users/i);
    expect(seed).not.toMatch(/delete\s+from\s+auth\.users/i);
  });

  it("covers every approved object and explicit relation family", () => {
    for (const table of [
      "public.companies",
      "public.meetings",
      "public.meeting_participants",
      "public.meeting_companies",
      "public.tasks",
      "public.task_companies",
      "public.task_meetings",
      "public.decisions",
      "public.decision_revisions",
      "public.decision_companies",
      "public.decision_meetings",
      "public.decision_tasks",
      "public.sprints",
      "public.sprint_tasks",
      "public.roadmap_items",
      "public.roadmap_item_companies",
      "public.roadmap_item_tasks",
      "public.roadmap_item_sprints",
      "public.roadmap_item_decisions",
    ]) {
      expect(seed).toContain(`insert into ${table}`);
    }
  });

  it("uses a fixed namespace, fails safely and ships a bounded cleanup", () => {
    expect(seed).toContain("f004");
    expect(seed).toContain("[SYNTHETIC W004]");
    expect(seed).toContain("reserved IDs already exist");
    expect(seed).toContain("will not alter an existing active Sprint");
    expect(cleanup).toContain("Cleanup stopped");
    expect(cleanup).not.toMatch(/delete\s+from\s+public\.members/i);
    expect(cleanup).not.toMatch(/delete\s+from\s+auth\.users/i);
    expect(cleanup).toContain("where id::text like 'f004%'");
  });

  it("declares valid, unique object identifiers for the documented volume", () => {
    const expected: Record<string, number> = {
      f0040001: 7,
      f0040002: 12,
      f0040003: 24,
      f0040004: 9,
      f0040005: 4,
      f0040006: 10,
    };

    for (const [family, count] of Object.entries(expected)) {
      const ids = [
        ...seed.matchAll(
          new RegExp(`'(${family}-[0-9a-f]{4}-4[0-9a-f]{3}-8[0-9a-f]{3}-[0-9a-f]{12})'`, "gi"),
        ),
      ].map((match) => match[1]);
      expect(new Set(ids).size).toBe(count);
    }

    const uuidLiterals = [...seed.matchAll(/'([0-9a-f]{8}-[0-9a-f-]{27,})'/gi)].map(
      (match) => match[1],
    );
    expect(
      uuidLiterals.every((id) =>
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-8[0-9a-f]{3}-[0-9a-f]{12}$/i.test(id),
      ),
    ).toBe(true);
  });
});
