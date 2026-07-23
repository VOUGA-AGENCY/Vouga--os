import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { CompanyStatus, ProspectingStage } from "@/domain/companies/company";
import type {
  CompanyDetail,
  CompanyListItem,
  CompanyReadModel,
} from "@/projections/companies/company-read-model";

type CompanyViewRow = {
  id: string;
  name: string;
  status: CompanyStatus;
  owner_member_id: string;
  current_context: string | null;
  relationship_risks: string | null;
  prospecting_stage: ProspectingStage | null;
  primary_contact_id: string | null;
  created_at: string;
  updated_at: string;
  owner: { display_name: string; email: string } | null;
};

const COMPANY_VIEW_SELECT =
  "id,name,status,owner_member_id,current_context,relationship_risks,prospecting_stage,primary_contact_id,created_at,updated_at,owner:members!companies_owner_member_id_fkey(display_name,email)";

function toListItem(row: CompanyViewRow): CompanyListItem {
  return {
    id: row.id,
    name: row.name,
    status: row.status,
    ownerDisplayName: row.owner?.display_name ?? "Owner indisponível",
    ownerEmail: row.owner?.email ?? "",
    currentContext: row.current_context,
    relationshipRisks: row.relationship_risks,
    prospectingStage: row.prospecting_stage,
    primaryContactId: row.primary_contact_id,
    updatedAt: row.updated_at,
  };
}

export class SupabaseCompanyReadModel implements CompanyReadModel {
  constructor(private readonly supabase: SupabaseClient) {}

  async list(): Promise<CompanyListItem[]> {
    const { data, error } = await this.supabase
      .from("companies")
      .select(COMPANY_VIEW_SELECT)
      .order("status")
      .order("updated_at", { ascending: false });

    if (error) throw new Error("Não foi possível carregar as Organisations.");
    return (data as unknown as CompanyViewRow[]).map(toListItem);
  }

  async findById(id: string): Promise<CompanyDetail | null> {
    const { data, error } = await this.supabase
      .from("companies")
      .select(COMPANY_VIEW_SELECT)
      .eq("id", id)
      .maybeSingle();

    if (error) throw new Error("Não foi possível carregar a Organisation.");
    if (!data) return null;

    const row = data as unknown as CompanyViewRow;
    return {
      ...toListItem(row),
      ownerMemberId: row.owner_member_id,
      createdAt: row.created_at,
    };
  }
}
