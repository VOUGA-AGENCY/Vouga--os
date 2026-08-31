import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";

const sql = readFileSync(
  new URL("../../../supabase/migrations/20260831123000_share_google_calendar_projections.sql", import.meta.url),
  "utf8",
);

describe("shared Google Calendar projection", () => {
  test("shares only projected event data and keeps replacement admin-only", () => {
    expect(sql).toContain("create table public.google_calendar_event_projections");
    expect(sql).toContain("public.is_active_member(auth.uid())");
    expect(sql).toContain("public.is_admin(auth.uid())");
    expect(sql).not.toContain("refresh_token");
  });
});
