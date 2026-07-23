import fs from "node:fs";
import path from "node:path";
import { describe, expect, test } from "vitest";

const migration = fs.readFileSync(
  path.join(process.cwd(), "supabase/migrations/20260723234500_create_vault_entries.sql"),
  "utf8",
);

describe("Vault migration", () => {
  test("persiste apenas metadata e envelope cifrado", () => {
    expect(migration).toContain("create table public.vault_entries");
    expect(migration).toContain("encrypted_payload jsonb not null");
    expect(migration).toContain("key_version integer not null");
    expect(migration).toContain("encrypted_payload ? 'ciphertext'");
    expect(migration).toContain("encrypted_payload ? 'iv'");
    expect(migration).not.toMatch(/\bpassword\b/);
    expect(migration).not.toMatch(/\busername\b/);
  });

  test("nega acesso direto e expõe lista sem ciphertext", () => {
    expect(migration).toContain(
      "revoke all on table public.vault_entries from public, anon, authenticated",
    );
    expect(migration).toContain("create function public.list_vault_entries()");
    const listFunction = migration.slice(
      migration.indexOf("create function public.list_vault_entries()"),
      migration.indexOf("create function public.get_vault_entry_ciphertext"),
    );
    expect(listFunction).not.toContain("encrypted_payload");
    expect(listFunction).not.toContain("ciphertext");
  });

  test("protege todas as funções com autenticação e grants mínimos", () => {
    expect(migration.match(/if auth\.uid\(\) is null/g)).toHaveLength(4);
    expect(migration).toContain(
      "grant execute on function public.get_vault_entry_ciphertext(uuid) to authenticated",
    );
    expect(migration).toContain(
      "revoke all on function public.get_vault_entry_ciphertext(uuid) from public, anon",
    );
  });
});
