import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const migrationPath = fileURLToPath(
  new URL("../../../supabase/migrations/20260715190000_create_companies.sql", import.meta.url),
);
const migration = readFileSync(migrationPath, "utf8");

describe("migration de Companies", () => {
  it("preserva os atributos, estados e constraints aprovados", () => {
    expect(migration).toContain("create table public.companies");
    expect(migration).toContain("owner_member_id uuid not null");
    expect(migration).toContain("status in ('active', 'inactive', 'archived')");
    expect(migration).toContain("companies_name_not_vouga_check");
    expect(migration).toContain("companies_require_active_owner");
  });

  it("usa RLS autenticada e não concede escrita ou leitura a anon", () => {
    expect(migration).toContain("alter table public.companies enable row level security");
    expect(migration).toContain("create policy companies_select_authenticated");
    expect(migration).toContain("create policy companies_insert_authenticated");
    expect(migration).toContain("create policy companies_update_authenticated");
    expect(migration).toContain("revoke all on table public.companies from anon");
    expect(migration).not.toContain("grant delete on table public.companies");
  });

  it("sincroniza o suporte mínimo de Member sem expor gestão ao cliente", () => {
    expect(migration).toContain("create table public.members");
    expect(migration).toContain("sync_auth_user_to_member_after_insert");
    expect(migration).toContain(
      "revoke insert, update, delete on table public.members from authenticated",
    );
  });
});
