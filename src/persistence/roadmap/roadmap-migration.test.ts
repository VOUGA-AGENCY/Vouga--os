import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
const sql = readFileSync(join(process.cwd(), "supabase/migrations/20260716150000_create_roadmap.sql"), "utf8");

describe("Roadmap migration", () => {
  it("mantém um Roadmap global como projeção, sem tabela container", () => {
    expect(sql).toContain("create table public.roadmap_items");
    expect(sql).not.toMatch(/create table public\.roadmaps\b/);
    expect(sql).toContain("kind in ('problem', 'outcome', 'hypothesis')");
    expect(sql).toContain("horizon in ('now', 'next', 'later')");
    expect(sql).not.toMatch(/\b(progress|percentage|gantt)\b/i);
  });
  it("protege Now com owner e movimento executável", () => {
    expect(sql).toContain("roadmap_items_now_owner_check");
    expect(sql).toContain("A Now Roadmap Item requires at least one related Task");
  });
  it("usa relações explícitas e exige Decision na mudança de horizonte", () => {
    for (const table of ["roadmap_item_companies", "roadmap_item_tasks", "roadmap_item_sprints", "roadmap_item_decisions"]) expect(sql).toContain(`create table public.${table}`);
    expect(sql).toContain("A horizon change requires a related Decision");
    expect(sql).not.toMatch(/create table public\.(relationships|contexts|costs)/);
  });
  it("expõe leitura autenticada e escrita apenas por RPC", () => {
    expect(sql).toContain("enable row level security");
    expect(sql).toContain("grant select on table public.roadmap_items");
    expect(sql).toContain("revoke all on table public.roadmap_items");
    expect(sql).toContain("grant execute on function public.create_roadmap_item");
  });
});
