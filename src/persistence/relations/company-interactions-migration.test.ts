import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const sql = readFileSync(
  new URL(
    "../../../supabase/migrations/20260829120000_anchor_contact_interactions_to_companies.sql",
    import.meta.url,
  ),
  "utf8",
).toLowerCase().replace(/\r\n/g, "\n");
const compactSql = sql.replace(/\s+/g, " ");

describe("Company-owned Contact Interactions migration", () => {
  it("faz backfill determinístico e aborta antes de admitir Company ausente", () => {
    expect(sql).toContain("add column company_id uuid");
    expect(sql).toContain("set company_id = contact.company_id");
    expect(sql).toContain("where company_id is null");
    expect(sql).toContain("raise exception");
    expect(sql).toContain("alter column company_id set not null");
  });

  it("mantém Company obrigatória e torna Profile opcional", () => {
    expect(sql).toContain("contact_interactions_company_id_fkey");
    expect(compactSql).toContain("references public.companies (id) on delete restrict");
    expect(sql).toContain("alter column contact_id drop not null");
    expect(compactSql).toContain("references public.contacts (id) on delete set null");
    expect(sql).toContain("contact_interactions_company_occurred_idx");
  });

  it("valida replies pela Organisation e aceita Interaction sem Profile", () => {
    expect(sql).toContain("parent_company <> new.company_id");
    expect(sql).toContain("same organisation");
    expect(sql).toContain("p_contact_id is not null and not exists");
    expect(sql).toContain("company_id,\n    contact_id");
  });

  it("preserva histórico no delete de Profile e protege a Organisation", () => {
    expect(sql).toContain("update public.contact_interactions\n  set contact_id = null");
    expect(sql).not.toContain("delete from public.contact_interactions\n  where contact_id");
    expect(sql).toContain("delete from public.project_contacts");
    expect(compactSql).toContain(
      "from public.contact_interactions where company_id = p_company_id",
    );
    expect(sql).toContain("public.google_event_artifact_contacts");
  });

  it("preserva autenticação e escrita append-only", () => {
    expect(sql).toContain("auth.uid() is null");
    expect(sql).toContain("security definer");
    expect(sql).toContain("set search_path = public, pg_temp");
    expect(sql).not.toContain("grant update on public.contact_interactions");
    expect(sql).not.toContain("grant delete on public.contact_interactions");
  });
});
