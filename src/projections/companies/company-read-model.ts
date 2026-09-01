import type { CompanyStatus, ProspectingStage } from "@/domain/companies/company";

export type CompanyListItem = Readonly<{
  id: string;
  name: string;
  status: CompanyStatus;
  ownerDisplayName: string;
  ownerEmail: string;
  primaryCae: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  currentContext: string | null;
  relationshipRisks: string | null;
  prospectingStage: ProspectingStage | null;
  primaryContactId: string | null;
  updatedAt: string;
}>;

export type CompanyDetail = CompanyListItem &
  Readonly<{
    ownerMemberId: string;
    createdAt: string;
  }>;

export interface CompanyReadModel {
  list(): Promise<CompanyListItem[]>;
  findById(id: string): Promise<CompanyDetail | null>;
}
