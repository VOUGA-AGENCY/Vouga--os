import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

const migrationUrl = new URL(
  "../../../supabase/migrations/20260719203000_create_google_meeting_mirrors.sql",
  import.meta.url,
);

describe("google meeting mirrors migration", () => {
  it("adds one publication target without storing Google event content", async () => {
    const sql = await readFile(migrationUrl, "utf8");

    expect(sql).toContain("add column publishes_os_events boolean not null default false");
    expect(sql).toContain("google_calendar_selections_one_publish_target");
    expect(sql).toContain("create function public.save_google_calendar_settings");
    expect(sql).toContain("Publish calendar must be visible");
  });

  it("stores only mirror identity and synchronization state", async () => {
    const sql = await readFile(migrationUrl, "utf8");

    expect(sql).toContain("create table public.google_meeting_mirrors");
    expect(sql).toContain("meeting_id uuid not null references public.meetings");
    expect(sql).toContain("google_event_id text not null");
    expect(sql).toContain("sync_status text not null");
    expect(sql).not.toMatch(/\bsummary\b|\bdescription\b|\bstarts_at\b|\bends_at\b/);
  });

  it("keeps writes behind authenticated functions", async () => {
    const sql = await readFile(migrationUrl, "utf8");

    expect(sql).toContain("alter table public.google_meeting_mirrors enable row level security");
    expect(sql).toContain("member_id = auth.uid()");
    expect(sql).toContain("revoke all on table public.google_meeting_mirrors from anon, authenticated");
    expect(sql).toContain("grant select on table public.google_meeting_mirrors to authenticated");
  });
});
