import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const sql = readFileSync(
  new URL(
    "../../../supabase/migrations/20260915190000_allow_updating_interaction_channel.sql",
    import.meta.url,
  ),
  "utf8",
).toLowerCase();

describe("Update contact interaction channel migration", () => {
  it("concede permissão de update para a coluna channel e adiciona suporte ao canal na RPC update_contact_interaction", () => {
    expect(sql).toContain("grant update(channel) on public.contact_interactions to authenticated");
    expect(sql).toContain("create or replace function public.update_contact_interaction");
    expect(sql).toContain("p_interaction_id uuid");
    expect(sql).toContain("p_body text");
    expect(sql).toContain("p_channel text default null");
    expect(sql).toContain("channel = coalesce(p_channel, channel)");
    expect(sql).toContain("p_channel not in ('email', 'linkedin', 'call')");
  });
});
