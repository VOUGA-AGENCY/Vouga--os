import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const sql = readFileSync(
  new URL(
    "../../../supabase/migrations/20260723213000_refine_contacts_workspace.sql",
    import.meta.url,
  ),
  "utf8",
).toLowerCase();

describe("Contacts workspace migration", () => {
  it("adiciona Acordado sem criar uma entidade de pipeline", () => {
    expect(sql).toContain("'agreed'");
    expect(sql).toContain("companies_prospecting_stage_check");
    expect(sql).not.toContain("create table public.pipeline");
    expect(sql).not.toContain("create table public.follow");
  });

  it("regista Interaction e estado na mesma operação com tempo do servidor", () => {
    expect(sql).toContain("create or replace function public.record_contact_interaction");
    expect(sql).toContain("insert into public.contact_interactions");
    expect(sql).toContain("occurred_at");
    expect(sql).toContain("now()");
    expect(sql).toContain("prospecting_stage = p_stage");
  });

  it("protege o delete de Organisation e preserva snapshots de Meeting", () => {
    expect(sql).toContain("create or replace function public.delete_contact_profile");
    expect(sql).toContain("set contact_id = null");
    expect(sql).toContain("create or replace function public.delete_company_if_unreferenced");
    expect(sql).toContain("protected operational context");
    expect(sql).not.toContain("delete from public.meetings");
    expect(sql).not.toContain("delete from public.tasks");
  });
});
