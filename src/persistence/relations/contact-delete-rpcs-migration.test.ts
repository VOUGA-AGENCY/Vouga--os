import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const sql = readFileSync(
  new URL(
    "../../../supabase/migrations/20260730181500_fix_contact_delete_rpcs.sql",
    import.meta.url,
  ),
  "utf8",
).toLowerCase();

describe("Contact delete RPC repair migration", () => {
  it("substitui apenas os RPCs e usa as relações Google oficiais", () => {
    expect(sql).toContain("create or replace function public.delete_contact_profile");
    expect(sql).toContain("create or replace function public.delete_company_if_unreferenced");
    expect(sql).toContain("public.google_event_artifact_contacts");
    expect(sql).toContain("public.google_event_artifact_companies");
    expect(sql).not.toMatch(/public\.google_event_contacts\b/);
    expect(sql).not.toMatch(/public\.google_event_companies\b/);
    expect(sql).not.toContain("create table");
  });

  it("preserva autenticação, privilégios mínimos e deletes protegidos", () => {
    expect(sql).toContain("auth.uid() is null");
    expect(sql).toContain("security definer");
    expect(sql).toContain("set search_path = public, pg_temp");
    expect(sql).toContain("revoke all on function public.delete_contact_profile");
    expect(sql).toContain("grant execute on function public.delete_contact_profile");
    expect(sql).toContain("revoke all on function public.delete_company_if_unreferenced");
    expect(sql).toContain("grant execute on function public.delete_company_if_unreferenced");
    expect(sql).not.toContain("delete from public.meetings");
    expect(sql).not.toContain("delete from public.tasks");
  });
});
