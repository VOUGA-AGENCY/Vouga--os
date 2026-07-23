import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { TaskContextDirectory } from "@/application/tasks/contracts";
export class SupabaseTaskContextDirectory implements TaskContextDirectory {
  constructor(private readonly supabase: SupabaseClient) {}
  async listCompanies() {
    const { data, error } = await this.supabase
      .from("companies")
      .select("id,name,status")
      .order("name");
    if (error) throw new Error("Não foi possível carregar Organisations.");
    return (data ?? []).map((x) => ({ id: x.id, name: x.name, archived: x.status === "archived" }));
  }
  async listMeetings() {
    const { data, error } = await this.supabase
      .from("meetings")
      .select("id,title,starts_at,kind")
      .gte("ends_at", new Date().toISOString())
      .neq("status", "cancelled")
      .neq("kind", "vacation")
      .order("starts_at");
    if (error) throw new Error("Não foi possível carregar Meetings e Events.");
    return (data ?? []).map((x) => ({
      id: x.id,
      title: x.title,
      startsAt: x.starts_at,
      kind: x.kind,
    }));
  }
  async companiesExist(ids: readonly string[]) {
    return this.exist("companies", ids);
  }
  async meetingsExist(ids: readonly string[]) {
    return this.exist("meetings", ids);
  }
  async decisionsExist(ids: readonly string[]) {
    return this.exist("decisions", ids);
  }
  private async exist(table: "companies" | "meetings" | "decisions", ids: readonly string[]) {
    const unique = [...new Set(ids)];
    if (!unique.length) return true;
    const { data, error } = await this.supabase.from(table).select("id").in("id", unique);
    if (error) throw new Error("Não foi possível validar contexto da Task.");
    return (data ?? []).length === unique.length;
  }
}
