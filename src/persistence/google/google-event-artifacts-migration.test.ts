import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

const migration = new URL(
  "../../../supabase/migrations/20260719213000_create_google_event_artifacts.sql",
  import.meta.url,
);

describe("google event artifacts migration", () => {
  it("persists identity and OS-only context without copying Google fields", async () => {
    const sql = await readFile(migration, "utf8");
    expect(sql).toContain("create table public.google_event_artifacts");
    expect(sql).toContain("classification text");
    expect(sql).toContain("purpose text");
    expect(sql).toContain("notes text");
    expect(sql).not.toMatch(/\btitle\b|\bdescription\b|\bstarts_at\b|\bends_at\b|\blocation\b/);
  });

  it("uses concrete Company and Contact relations", async () => {
    const sql = await readFile(migration, "utf8");
    expect(sql).toContain("create table public.google_event_artifact_companies");
    expect(sql).toContain("create table public.google_event_artifact_contacts");
    expect(sql).toContain("references public.companies");
    expect(sql).toContain("references public.contacts");
  });

  it("keeps writes behind an authenticated function and own-member RLS", async () => {
    const sql = await readFile(migration, "utf8");
    expect(sql).toContain("member_id = auth.uid()");
    expect(sql).toContain("create function public.save_google_event_artifact");
    expect(sql).toContain("revoke all on public.google_event_artifacts");
  });
});
