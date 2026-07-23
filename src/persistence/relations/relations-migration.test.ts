import { describe, expect, test } from "vitest";
import { readFileSync } from "node:fs";
const sql = readFileSync(
  new URL("../../../supabase/migrations/20260717163000_create_relations.sql", import.meta.url),
  "utf8",
);
describe("Relations migration", () => {
  test("separa Contacts, templates e Interactions sem tabela Relation", () => {
    expect(sql).toContain("create table public.contacts");
    expect(sql).toContain("create table public.contact_message_templates");
    expect(sql).toContain("create table public.contact_interactions");
    expect(sql).not.toContain("create table public.relations");
  });
  test("mantém Interactions append-only e participantes reconhecidos", () => {
    expect(sql).toContain("add column contact_id");
    expect(sql).toContain("grant select,insert on public.contact_interactions");
    expect(sql).not.toContain("grant select,insert,update on public.contact_interactions");
  });
  test("protege acesso e preserva save_meeting como invoker", () => {
    expect(sql).toContain("enable row level security");
    expect(sql).toContain("security invoker");
    expect(sql).toContain("revoke all on public.contacts");
  });
});
