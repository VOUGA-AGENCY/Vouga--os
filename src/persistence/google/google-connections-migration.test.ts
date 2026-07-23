import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";

const sql = readFileSync(
  new URL(
    "../../../supabase/migrations/20260719165000_create_google_connections.sql",
    import.meta.url,
  ),
  "utf8",
);

describe("Google connections migration", () => {
  test("guarda apenas a ligação OAuth e não duplica Calendar ou Notes", () => {
    expect(sql).toContain("create table public.google_connections");
    expect(sql).not.toContain("create table public.google_events");
    expect(sql).not.toContain("create table public.notes");
  });

  test("isola cada ligação pelo Member autenticado", () => {
    expect(sql).toContain("member_id = auth.uid()");
    expect(sql).toContain("enable row level security");
    expect(sql).toContain("revoke all on table public.google_connections from anon");
  });

  test("remove a credencial cifrada quando a ligação é revogada", () => {
    expect(sql).toContain("refresh_token_ciphertext is null");
    expect(sql).toContain("refresh_token_iv is null");
    expect(sql).toContain("status in ('active', 'revoked')");
  });
});
