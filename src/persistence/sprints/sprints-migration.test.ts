import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
const sql = readFileSync(new URL("../../../supabase/migrations/20260716120000_create_sprints.sql", import.meta.url), "utf8").toLowerCase();
describe("migration de Sprints", () => {
  it("preserva entidade e compromisso histórico sem progresso persistido", () => { expect(sql).toContain("create table public.sprints"); expect(sql).toContain("create table public.sprint_tasks"); expect(sql).toContain("committed_at"); expect(sql).toContain("closure_disposition"); expect(sql).not.toContain("progress_percent"); expect(sql).not.toContain("velocity"); expect(sql).not.toContain("story_points"); });
  it("garante uma Sprint ativa e fecho atómico", () => { expect(sql).toContain("sprints_single_active_idx"); expect(sql).toContain("where status = 'active'"); expect(sql).toContain("actual_result is not null and learning is not null"); expect(sql).toContain("create function public.close_sprint"); expect(sql).toContain("every sprint commitment requires a closure disposition"); expect(sql).not.toContain("next_sprint"); });
  it("protege escrita por RPCs autenticadas e RLS", () => { for (const table of ["sprints", "sprint_tasks"]) expect(sql).toContain(`alter table public.${table} enable row level security`); expect(sql).toContain("revoke all on table public.sprints, public.sprint_tasks from anon, authenticated"); expect(sql).toContain("security definer"); expect(sql).toContain("auth.uid() is null"); });
});
