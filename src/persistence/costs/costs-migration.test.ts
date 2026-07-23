import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const sql = readFileSync(
  resolve(process.cwd(), "supabase/migrations/20260716200000_create_costs.sql"),
  "utf8",
);

describe("Costs migration", () => {
  it("creates operational costs, task relations and append-only cash snapshots", () => {
    expect(sql).toContain("create table public.costs");
    expect(sql).toContain("create table public.cost_tasks");
    expect(sql).toContain("create table public.cash_balance_snapshots");
    expect(sql).toContain("cash_balance_snapshots_append_only");
  });
  it("keeps writes behind authenticated RPCs and RLS", () => {
    expect(sql).toContain("alter table public.costs enable row level security");
    expect(sql).toContain("create function public.transition_cost");
    expect(sql).toContain("grant execute on function public.create_cost");
    expect(sql).toContain("grant execute on function public.create_cash_balance_snapshot");
  });
});
