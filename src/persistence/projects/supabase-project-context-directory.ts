import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  ProjectContextDirectory,
  ProjectContextOption,
} from "@/application/projects/contracts";
import type { ValidProjectValues } from "@/domain/projects/project";

export class SupabaseProjectContextDirectory implements ProjectContextDirectory {
  constructor(private readonly supabase: SupabaseClient) {}

  async getOptions() {
    const [companies, contacts, tasks, meetings, decisions, costs] = await Promise.all([
      this.supabase.from("companies").select("id,name,status").order("name"),
      this.supabase
        .from("contacts")
        .select("id,display_name,company_id,job_title,status")
        .eq("status", "active")
        .order("display_name"),
      this.supabase
        .from("tasks")
        .select("id,title,status")
        .order("updated_at", { ascending: false }),
      this.supabase
        .from("meetings")
        .select("id,title,kind,status,starts_at")
        .neq("kind", "vacation")
        .order("starts_at", { ascending: false }),
      this.supabase
        .from("decisions")
        .select("id,title,status,decided_on")
        .order("decided_on", { ascending: false }),
      this.supabase
        .from("costs")
        .select("id,title,status,currency,expected_amount_minor")
        .order("updated_at", { ascending: false }),
    ]);
    if (
      companies.error ||
      contacts.error ||
      tasks.error ||
      meetings.error ||
      decisions.error ||
      costs.error
    ) {
      throw new Error("Não foi possível carregar as relações de Projects.");
    }
    const option = (
      id: string,
      label: string,
      meta: string,
      extra: Partial<ProjectContextOption> = {},
    ): ProjectContextOption => ({ id, label, meta, ...extra });
    return {
      companies: (companies.data ?? []).map((item) =>
        option(item.id, item.name, item.status, { status: item.status }),
      ),
      contacts: (contacts.data ?? []).map((item) =>
        option(item.id, item.display_name, item.job_title ?? "Perfil", {
          companyId: item.company_id,
          status: item.status,
        }),
      ),
      tasks: (tasks.data ?? []).map((item) =>
        option(item.id, item.title, item.status, { status: item.status }),
      ),
      meetings: (meetings.data ?? []).map((item) =>
        option(item.id, item.title, item.starts_at.slice(0, 10), {
          kind: item.kind,
          status: item.status,
        }),
      ),
      decisions: (decisions.data ?? []).map((item) =>
        option(item.id, item.title, item.decided_on, { status: item.status }),
      ),
      costs: (costs.data ?? []).map((item) =>
        option(
          item.id,
          item.title,
          `${item.currency} ${(item.expected_amount_minor / 100).toFixed(2)}`,
          { status: item.status },
        ),
      ),
    };
  }

  async referencesExist(values: ValidProjectValues) {
    const checks = await Promise.all([
      this.exists("companies", [values.clientCompanyId]),
      this.contactsBelongToClient(values.contactIds, values.clientCompanyId),
      this.exists("tasks", values.taskIds),
      this.meetingsAreEligible(values.meetingIds),
      this.exists("decisions", values.decisionIds),
      this.exists("costs", values.costIds),
      this.nextTaskIsOpen(values.nextTaskId),
    ]);
    return checks.every(Boolean);
  }

  private async contactsBelongToClient(ids: readonly string[], companyId: string) {
    if (!ids.length) return true;
    const { count, error } = await this.supabase
      .from("contacts")
      .select("id", { count: "exact", head: true })
      .in("id", [...ids])
      .eq("company_id", companyId)
      .eq("status", "active");
    return !error && count === ids.length;
  }

  private async meetingsAreEligible(ids: readonly string[]) {
    if (!ids.length) return true;
    const { count, error } = await this.supabase
      .from("meetings")
      .select("id", { count: "exact", head: true })
      .in("id", [...ids])
      .neq("kind", "vacation");
    return !error && count === ids.length;
  }

  private async nextTaskIsOpen(id: string | null) {
    if (!id) return true;
    const { count, error } = await this.supabase
      .from("tasks")
      .select("id", { count: "exact", head: true })
      .eq("id", id)
      .in("status", ["todo", "in_progress", "blocked"]);
    return !error && count === 1;
  }

  private async exists(
    table: "companies" | "tasks" | "decisions" | "costs",
    ids: readonly string[],
  ) {
    if (!ids.length) return true;
    const { count, error } = await this.supabase
      .from(table)
      .select("id", { count: "exact", head: true })
      .in("id", [...ids]);
    return !error && count === ids.length;
  }
}
