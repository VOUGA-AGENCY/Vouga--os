import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const sql = readFileSync(
  new URL(
    "../../../supabase/migrations/20260910143000_allow_updating_contact_interactions.sql",
    import.meta.url,
  ),
  "utf8",
).toLowerCase();

describe("Update contact interactions migration", () => {
  it("permite atualizar o corpo da interação e cria a RPC update_contact_interaction", () => {
    expect(sql).toContain("interactions_update_authenticated");
    expect(sql).toContain("grant update(body) on public.contact_interactions to authenticated");
    expect(sql).toContain("create or replace function public.update_contact_interaction");
    expect(sql).toContain("p_interaction_id uuid");
    expect(sql).toContain("p_body text");
  });
});
