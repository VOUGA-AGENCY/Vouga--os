import type { Company, ValidCompanyValues } from "@/domain/companies/company";
export type { ActiveMember, MemberDirectory } from "@/application/members/contracts";

export interface CompanyRepository {
  list(): Promise<Company[]>;
  findById(id: string): Promise<Company | null>;
  create(values: ValidCompanyValues): Promise<Company>;
  update(company: Company): Promise<Company>;
  deleteIfUnreferenced(
    id: string,
  ): Promise<"deleted" | "profiles" | "protected" | "not_found">;
}
