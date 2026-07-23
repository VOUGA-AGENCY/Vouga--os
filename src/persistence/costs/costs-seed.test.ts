import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
const seed = readFileSync(
  resolve(process.cwd(), "supabase/seed/synthetic_costs_dataset.sql"),
  "utf8",
);
const cleanup = readFileSync(
  resolve(process.cwd(), "supabase/seed/synthetic_costs_dataset_cleanup.sql"),
  "utf8",
);
describe("Costs synthetic dataset", () => {
  it("covers recurring, one-off, paid, future, cancelled and contextual costs", () => {
    for (const value of [
      "'recurring'",
      "'one_off'",
      "'paid'",
      "'cancelled'",
      "company_id",
      "roadmap_item_id",
      "source_decision_id",
      "cost_tasks",
    ])
      expect(seed).toContain(value);
  });
  it("uses reserved synthetic IDs and includes controlled cleanup", () => {
    expect(seed).toContain("f006");
    expect(seed).toContain("No real financial data");
    expect(cleanup).toContain("title not like '[SYNTHETIC B006]%'");
    expect(cleanup).toContain("delete from public.cash_balance_snapshots");
  });
});
