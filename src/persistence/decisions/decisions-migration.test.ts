import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const sql = readFileSync(
  new URL("../../../supabase/migrations/20260716030000_create_decisions.sql", import.meta.url),
  "utf8",
).toLowerCase();

describe("migration de Decisions", () => {
  it("cria Decision, cadeia e relações explícitas sem módulos futuros", () => {
    expect(sql).toContain("create table public.decisions");
    expect(sql).toContain("create table public.decision_revisions");
    expect(sql).toContain("create table public.decision_companies");
    expect(sql).toContain("create table public.decision_meetings");
    expect(sql).toContain("create table public.decision_tasks");
    expect(sql).not.toContain("create table public.sprints");
    expect(sql).not.toContain("create table public.roadmap");
    expect(sql).not.toContain("create table public.relationships");
  });

  it("impede autorreferência e preserva revisão append-only", () => {
    expect(sql).toContain("decision_revisions_distinct_check");
    expect(sql).toContain("decision_id <> previous_decision_id");
    expect(sql).toContain("only a current decision can be reviewed");
    expect(sql).toContain("if p_review_effect = 'supersedes'");
    expect(sql).toContain("elsif p_review_effect = 'revokes'");
    expect(sql).not.toContain("delete from public.decision_revisions");
  });

  it("estende a origem concreta de Task sem chave polimórfica", () => {
    expect(sql).toContain("add column origin_decision_id uuid");
    expect(sql).toContain("origin_type = 'decision'");
    expect(sql).toContain("create or replace function public.save_task");
    expect(sql).not.toContain("origin_id");
  });

  it("restringe escrita às RPCs autenticadas e ativa RLS", () => {
    for (const table of [
      "decisions",
      "decision_revisions",
      "decision_companies",
      "decision_meetings",
      "decision_tasks",
    ]) {
      expect(sql).toContain(`alter table public.${table} enable row level security`);
      expect(sql).toContain(`revoke all on table public.${table}`);
    }
    expect(sql).toContain("security definer");
    expect(sql).toContain("if auth.uid() is null");
    expect(sql).toContain("grant execute on function public.create_decision");
  });
});
