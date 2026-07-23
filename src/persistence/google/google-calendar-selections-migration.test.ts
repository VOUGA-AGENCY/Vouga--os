import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";

const sql = readFileSync(
  new URL(
    "../../../supabase/migrations/20260719183000_create_google_calendar_selections.sql",
    import.meta.url,
  ),
  "utf8",
);

describe("Google calendar selections migration", () => {
  test("persiste apenas Member e calendar ID", () => {
    expect(sql).toContain("create table public.google_calendar_selections");
    expect(sql).toContain("calendar_id text not null");
    expect(sql).not.toContain("calendar_name");
    expect(sql).not.toContain("event_id");
  });

  test("substitui a seleção atomicamente e apenas para o próprio Member", () => {
    expect(sql).toContain("create function public.save_google_calendar_selections");
    expect(sql).toContain("p_member_id <> auth.uid()");
    expect(sql).toContain("delete from public.google_calendar_selections");
    expect(sql).toContain("insert into public.google_calendar_selections");
  });

  test("impede escrita direta do cliente autenticado", () => {
    expect(sql).toContain(
      "revoke all on table public.google_calendar_selections from anon, authenticated",
    );
    expect(sql).toContain(
      "grant select on table public.google_calendar_selections to authenticated",
    );
  });
});
