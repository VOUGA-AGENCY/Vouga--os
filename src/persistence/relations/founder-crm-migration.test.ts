import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const sql = readFileSync(
  new URL("../../../supabase/migrations/20260723173000_add_founder_crm.sql", import.meta.url),
  "utf8",
).toLowerCase();

describe("Founder CRM migration", () => {
  it("expande fontes oficiais sem criar entidades paralelas", () => {
    expect(sql).toContain("add column prospecting_stage");
    expect(sql).toContain("add column primary_contact_id");
    expect(sql).toContain("add column purpose");
    expect(sql).toContain("add column situation");
    expect(sql).not.toContain("create table public.follow");
    expect(sql).not.toContain("create table public.crm");
  });

  it("regista Interaction e Task de follow-up na mesma operação", () => {
    expect(sql).toContain("create function public.record_prospecting_touch");
    expect(sql).toContain("insert into public.contact_interactions");
    expect(sql).toContain("'relationship_follow_up'");
    expect(sql).toContain("insert into public.task_companies");
  });

  it("mantém fotografia importada no campo oficial com limite defensivo", () => {
    expect(sql).toContain("avatar_url like 'data:image/%'");
    expect(sql).toContain("char_length(avatar_url) <= 350000");
  });
});
