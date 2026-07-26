import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const sql = readFileSync(
  join(process.cwd(), "supabase/migrations/20260726190000_create_projects.sql"),
  "utf8",
);

describe("Projects migration", () => {
  it("cria Project como entrega comercial com ciclo de vida fechado", () => {
    expect(sql).toContain("create table public.projects");
    expect(sql).toContain(
      "status in ('not_started', 'in_progress', 'waiting_client', 'delivered', 'closed')",
    );
    expect(sql).toContain("target_delivery_on >= starts_on");
    expect(sql).toContain("received_amount_minor <= agreed_amount_minor");
  });

  it("usa relações concretas e não cria Context ou Activity genéricos", () => {
    for (const table of [
      "project_members",
      "project_contacts",
      "project_tasks",
      "project_meetings",
      "project_decisions",
      "project_costs",
    ]) {
      expect(sql).toContain(`create table public.${table}`);
    }
    expect(sql).not.toMatch(/create table public\.(relationships|contexts|activity_log)\b/);
  });

  it("mantém próxima ação como Task aberta e relacionada", () => {
    expect(sql).toContain("Project next action must be a related Task");
    expect(sql).toContain("Project next action must be an open Task");
    expect(sql).not.toContain("next_action_title");
    expect(sql).not.toContain("next_action_owner");
  });

  it("preserva atividade apenas através de transições tipadas", () => {
    expect(sql).toContain("create table public.project_status_changes");
    expect(sql).toContain("create function public.transition_project");
    expect(sql).toContain("Invalid Project status transition");
  });

  it("expõe leitura autenticada e escrita apenas através de RPCs", () => {
    expect(sql).toContain("alter table public.projects enable row level security");
    expect(sql).toContain("revoke all on table");
    expect(sql).toContain("grant select on table");
    expect(sql).toContain("grant execute on function public.create_project");
    expect(sql).toContain("grant execute on function public.update_project");
    expect(sql).toContain("grant execute on function public.transition_project");
  });
});
