import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const sql = readFileSync(
  new URL(
    "../../../supabase/migrations/20260910123000_add_strategic_partnership_and_budgeting_stages.sql",
    import.meta.url,
  ),
  "utf8",
).toLowerCase();

describe("Prospecting stages migration", () => {
  it("adiciona os estados strategic_partnership e budgeting à constraint de companies", () => {
    expect(sql).toContain("companies_prospecting_stage_check");
    expect(sql).toContain("'strategic_partnership'");
    expect(sql).toContain("'budgeting'");
    expect(sql).toContain("'agreed'");
    expect(sql).toContain("'contacted'");
    expect(sql).toContain("'to_contact'");
  });
});
