import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const sql = readFileSync(
  new URL(
    "../../../supabase/migrations/20260723233000_add_calendar_vacations.sql",
    import.meta.url,
  ),
  "utf8",
).toLowerCase();

describe("Calendar vacations migration", () => {
  it("extends Meeting without creating a parallel calendar object", () => {
    expect(sql).toContain("kind in ('meeting', 'event', 'vacation')");
    expect(sql).toContain("add column calendar_tone text");
    expect(sql).not.toContain("create table public.vacation");
    expect(sql).not.toContain("create table public.leave");
  });

  it("keeps Vacation minimal and validates one Member plus semantic tone", () => {
    expect(sql).toContain("requires exactly one internal participant");
    expect(sql).toContain("'orange', 'blue', 'green', 'purple', 'pink', 'red'");
    expect(sql).toContain("a vacation cannot carry operational relations");
  });

  it("updates the existing transactional save command", () => {
    expect(sql).toContain("create or replace function public.save_meeting");
    expect(sql).toContain("calendar_tone = selected_tone");
    expect(sql).toContain("insert into public.meeting_participants");
  });
});
