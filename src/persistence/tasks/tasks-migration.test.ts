import { readFileSync } from "node:fs";
import { describe,expect,it } from "vitest";
const sql=readFileSync(new URL("../../../supabase/migrations/20260716003000_create_tasks.sql",import.meta.url),"utf8").toLowerCase();
describe("migration de Tasks",()=>{
 it("cria Task e relações concretas sem módulos futuros",()=>{expect(sql).toContain("create table public.tasks");expect(sql).toContain("create table public.task_companies");expect(sql).toContain("create table public.task_meetings");expect(sql).not.toContain("create table public.sprints");expect(sql).not.toContain("create table public.decisions");expect(sql).not.toContain("relationships");});
 it("reforça origem, bloqueio e conclusão",()=>{expect(sql).toContain("tasks_origin_check");expect(sql).toContain("tasks_blocked_check");expect(sql).toContain("tasks_completion_check");expect(sql).toContain("tasks_require_active_owner");});
 it("guarda agregado com invoker e RLS autenticada",()=>{expect(sql).toContain("create function public.save_task");expect(sql).toContain("security invoker");for(const table of ["tasks","task_companies","task_meetings"]){expect(sql).toContain(`alter table public.${table} enable row level security`);expect(sql).toContain(`revoke all on table public.${table}`);}});
});
