import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { DecisionContextDirectory } from "@/application/decisions/contracts";
import type { TaskStatus } from "@/domain/tasks/task";

export class SupabaseDecisionContextDirectory implements DecisionContextDirectory {
  constructor(private readonly supabase: SupabaseClient) {}

  async listCompanies() {
    const { data, error } = await this.supabase
      .from("companies")
      .select("id,name,status")
      .order("name");
    if (error) throw new Error("Não foi possível carregar Organisations para a Decision.");
    return (data ?? []).map((company) => ({
      id: company.id,
      name: company.name,
      archived: company.status === "archived",
    }));
  }

  async listMeetings() {
    const { data, error } = await this.supabase
      .from("meetings")
      .select("id,title,starts_at")
      .neq("kind", "vacation")
      .order("starts_at", { ascending: false });
    if (error) throw new Error("Não foi possível carregar Meetings para a Decision.");
    return (data ?? []).map((meeting) => ({
      id: meeting.id,
      title: meeting.title,
      startsAt: meeting.starts_at,
    }));
  }

  async listTasks() {
    const { data, error } = await this.supabase
      .from("tasks")
      .select("id,title,status")
      .order("updated_at", { ascending: false });
    if (error) throw new Error("Não foi possível carregar Tasks para a Decision.");
    return (data ?? []).map((task) => ({
      id: task.id,
      title: task.title,
      status: task.status as TaskStatus,
    }));
  }

  companiesExist(ids: readonly string[]) {
    return this.exist("companies", ids);
  }

  meetingsExist(ids: readonly string[]) {
    return this.exist("meetings", ids);
  }

  tasksExist(ids: readonly string[]) {
    return this.exist("tasks", ids);
  }

  private async exist(table: "companies" | "meetings" | "tasks", ids: readonly string[]) {
    const unique = [...new Set(ids)];
    if (unique.length === 0) return true;
    const { data, error } = await this.supabase.from(table).select("id").in("id", unique);
    if (error) throw new Error("Não foi possível validar o contexto da Decision.");
    return (data ?? []).length === unique.length;
  }
}
