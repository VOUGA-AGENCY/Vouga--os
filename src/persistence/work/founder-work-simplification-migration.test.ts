import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const sql = readFileSync(
  "supabase/migrations/20260719223000_simplify_founder_work_objects.sql",
  "utf8",
);

describe("founder work simplification migration", () => {
  it("keeps legacy fields readable while new saves no longer require them", () => {
    expect(sql).toContain("alter column purpose drop not null");
    expect(sql).toContain("alter column expected_result drop not null");
    expect(sql).toContain("purpose=null");
    expect(sql).toContain("expected_result=null");
  });
  it("uses concrete Google event identity and participant closure", () => {
    expect(sql).toContain("tasks_origin_google_event_fkey");
    expect(sql).toContain("Only a participant can close this Meeting");
  });
  it("blocks hard deletion when protected history exists", () => {
    expect(sql).toContain("Meeting has protected history");
    expect(sql).toContain("Task has protected context");
    expect(sql).not.toContain("grant delete on");
  });
});
