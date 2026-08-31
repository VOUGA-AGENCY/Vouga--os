import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";

const sql = readFileSync(
  new URL("../../../supabase/migrations/20260831120000_create_shared_notes_workspace.sql", import.meta.url),
  "utf8",
);

describe("shared Notes workspace migration", () => {
  test("creates shared folders, items and a private constrained bucket", () => {
    expect(sql).toContain("create table public.note_folders");
    expect(sql).toContain("create table public.note_items");
    expect(sql).toContain("'notes-files', 'notes-files', false, 4194304");
  });

  test("keeps Google writes and deletes admin-only", () => {
    expect(sql).toContain("public.is_active_member(auth.uid())");
    expect(sql).toContain("kind <> 'google_doc' or public.is_admin(auth.uid())");
    expect(sql).toContain("revoke all on table public.note_items from anon");
  });

  test("does not expose or duplicate Google credentials", () => {
    expect(sql).not.toContain("refresh_token_ciphertext");
    expect(sql).not.toContain("service_role");
  });
});
