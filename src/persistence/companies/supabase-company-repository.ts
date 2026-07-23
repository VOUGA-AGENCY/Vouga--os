import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { CompanyRepository } from "@/application/companies/contracts";
import type {
  Company,
  CompanyStatus,
  ProspectingStage,
  ValidCompanyValues,
} from "@/domain/companies/company";

type CompanyRow = {
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
};

export class CompanyPersistenceError extends Error {
  constructor(message = "Não foi possível aceder às Organisations.") {
    super(message);
    this.name = "CompanyPersistenceError";
  }
}

function toCompany(row: CompanyRow): Company {
  return {
    id: row.id,
    name: row.name,
    status: row.status,
    ownerMemberId: row.owner_member_id,
    currentContext: row.current_context,
    relationshipRisks: row.relationship_risks,
    prospectingStage: row.prospecting_stage,
    primaryContactId: row.primary_contact_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toRowValues(values: ValidCompanyValues) {
  return {
    name: values.name,
    status: values.status,
    owner_member_id: values.ownerMemberId,
    current_context: values.currentContext,
    relationship_risks: values.relationshipRisks,
    prospecting_stage: values.prospectingStage,
    primary_contact_id: values.primaryContactId,
  };
}

export class SupabaseCompanyRepository implements CompanyRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async list(): Promise<Company[]> {
    const { data, error } = await this.supabase
      .from("companies")
      .select(
        "id,name,status,owner_member_id,current_context,relationship_risks,prospecting_stage,primary_contact_id,created_at,updated_at",
      )
      .order("updated_at", { ascending: false });

    if (error) throw new CompanyPersistenceError();
    return (data as CompanyRow[]).map(toCompany);
  }

  async findById(id: string): Promise<Company | null> {
    const { data, error } = await this.supabase
      .from("companies")
      .select(
        "id,name,status,owner_member_id,current_context,relationship_risks,prospecting_stage,primary_contact_id,created_at,updated_at",
      )
      .eq("id", id)
      .maybeSingle();

    if (error) throw new CompanyPersistenceError();
    return data ? toCompany(data as CompanyRow) : null;
  }

  async create(values: ValidCompanyValues): Promise<Company> {
    const { data, error } = await this.supabase
      .from("companies")
      .insert(toRowValues(values))
      .select(
        "id,name,status,owner_member_id,current_context,relationship_risks,prospecting_stage,primary_contact_id,created_at,updated_at",
      )
      .single();

    if (error || !data)
      throw new CompanyPersistenceError("Não foi possível criar a Organisation.");
    return toCompany(data as CompanyRow);
  }

  async update(company: Company): Promise<Company> {
    const { data, error } = await this.supabase
      .from("companies")
      .update({
        name: company.name,
        status: company.status,
        owner_member_id: company.ownerMemberId,
        current_context: company.currentContext,
        relationship_risks: company.relationshipRisks,
        prospecting_stage: company.prospectingStage,
        primary_contact_id: company.primaryContactId,
      })
      .eq("id", company.id)
      .select(
        "id,name,status,owner_member_id,current_context,relationship_risks,prospecting_stage,primary_contact_id,created_at,updated_at",
      )
      .single();

    if (error || !data)
      throw new CompanyPersistenceError("Não foi possível atualizar a Organisation.");
    return toCompany(data as CompanyRow);
  }

  async deleteIfUnreferenced(
    id: string,
  ): Promise<"deleted" | "profiles" | "protected" | "not_found"> {
    const { error } = await this.supabase.rpc("delete_company_if_unreferenced", {
      p_company_id: id,
    });
    if (!error) return "deleted";
    const message = error.message.toLocaleLowerCase("en");
    if (message.includes("profiles first")) return "profiles";
    if (message.includes("protected operational context")) return "protected";
    if (message.includes("not found")) return "not_found";
    throw new CompanyPersistenceError("Não foi possível eliminar a Organisation.");
  }
}
