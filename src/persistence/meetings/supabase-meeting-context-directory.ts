import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { MeetingContextDirectory } from "@/application/meetings/contracts";

export class SupabaseMeetingContextDirectory implements MeetingContextDirectory {
  constructor(private readonly supabase: SupabaseClient) {}
  async listCompanies() {
    const { data, error } = await this.supabase
      .from("companies")
      .select("id,name,status")
      .order("name");
    if (error) throw new Error("Não foi possível carregar Organisations.");
    return (data ?? []).map((row) => ({
      id: row.id,
      name: row.name,
      archived: row.status === "archived",
    }));
  }
  async companiesExist(ids: readonly string[]) {
    return this.exist("companies", ids);
  }
  async listTasks() {
    const { data, error } = await this.supabase
      .from("tasks")
      .select("id,title,status")
      .order("updated_at", { ascending: false });
    if (error) throw new Error("Não foi possível carregar Tasks.");
    return (data ?? []).map((row) => ({ id: row.id, title: row.title, status: row.status }));
  }
  async tasksExist(ids: readonly string[]) {
    return this.exist("tasks", ids);
  }
  async listContacts() {
    const { data, error } = await this.supabase
      .from("contacts")
      .select("id,display_name,company:companies!contacts_company_id_fkey(name)")
      .eq("status", "active")
      .order("display_name");
    if (error) throw new Error("Não foi possível carregar Contacts.");
    return (data ?? []).map((row) => ({
      id: row.id,
      displayName: row.display_name,
      companyName: row.company?.[0]?.name ?? null,
    }));
  }
  async contactsExist(ids: readonly string[]) {
    const unique = [...new Set(ids)];
    if (!unique.length) return true;
    const { data, error } = await this.supabase
      .from("contacts")
      .select("id")
      .in("id", unique)
      .eq("status", "active");
    return !error && (data ?? []).length === unique.length;
  }
  private async exist(table: "companies" | "tasks", ids: readonly string[]) {
    const unique = [...new Set(ids)];
    if (!unique.length) return true;
    const { data, error } = await this.supabase.from(table).select("id").in("id", unique);
    if (error) throw new Error("Não foi possível validar o contexto.");
    return (data ?? []).length === unique.length;
  }
}
