import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const seed = readFileSync(resolve("supabase/seed/synthetic_calendar_dataset.sql"), "utf8");
const cleanup = readFileSync(
  resolve("supabase/seed/synthetic_calendar_dataset_cleanup.sql"),
  "utf8",
);

describe("synthetic Calendar dataset", () => {
  it("is deterministic, guarded and depends explicitly on W004", () => {
    expect(seed).toContain("f0070001-0000-4000-8000-000000000001");
    expect(seed).toContain("f0070002-0000-4000-8000-000000000001");
    expect(seed).toContain("requires the W004 operating dataset");
    expect(seed).toContain("reserved IDs already exist");
    expect(seed).not.toContain("auth.users");
  });

  it("creates only official source objects and no Calendar table", () => {
    expect(seed).toContain("insert into public.meetings");
    expect(seed).toContain("insert into public.tasks");
    expect(seed).not.toMatch(/calendar_events|calendar_entries|calendar_occurrences/i);
  });

  it("cleans only the reserved B007 namespace", () => {
    expect(cleanup).toContain("id::text like 'f007%'");
    expect(cleanup).not.toContain("truncate");
    expect(cleanup).not.toContain("f004%");
  });
});
