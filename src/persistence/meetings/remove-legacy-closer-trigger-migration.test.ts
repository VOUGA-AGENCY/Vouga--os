import fs from "node:fs";
import path from "node:path";
import { describe, expect, test } from "vitest";

const migration = fs.readFileSync(
  path.join(
    process.cwd(),
    "supabase/migrations/20260724000000_remove_legacy_meeting_closer_trigger.sql",
  ),
  "utf8",
);

describe("legacy Meeting closer trigger migration", () => {
  test("remove apenas o trigger incompatível com o modelo atual", () => {
    expect(migration).toContain(
      "drop trigger if exists meetings_require_active_closer on public.meetings",
    );
    expect(migration).not.toContain("meeting_participants_require_active_member");
    expect(migration).not.toContain("drop function");
    expect(migration).not.toContain("alter table");
  });
});
