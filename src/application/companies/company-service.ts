import {
  archiveCompany,
  type Company,
  type CompanyValues,
  CompanyValidationError,
  type ProspectingStage,
  PROSPECTING_STAGES,
  validateCompanyValues,
} from "@/domain/companies/company";

import type { ActiveMember, MemberDirectory } from "@/application/members/contracts";
import type { CompanyRepository } from "./contracts";

export class CompanyNotFoundError extends Error {
  constructor() {
    super("A Organisation não existe.");
    this.name = "CompanyNotFoundError";
  }
}

export class CompanyOwnerError extends Error {
  constructor() {
    super("Seleciona um owner ativo para a relação.");
    this.name = "CompanyOwnerError";
  }
}

export class CompanyDeleteBlockedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CompanyDeleteBlockedError";
  }
}

export class CompanyService {
  constructor(
    private readonly companies: CompanyRepository,
    private readonly members: MemberDirectory,
  ) {}

  listCompanies(): Promise<Company[]> {
    return this.companies.list();
  }

  listActiveOwners(): Promise<ActiveMember[]> {
    return this.members.listActive();
  }

  async getCompany(id: string): Promise<Company> {
    const company = await this.companies.findById(id);
    if (!company) throw new CompanyNotFoundError();
    return company;
  }

  async createCompany(values: CompanyValues): Promise<Company> {
    const validValues = validateCompanyValues(values);
    await this.assertActiveOwner(validValues.ownerMemberId);
    return this.companies.create(validValues);
  }

  async updateCompany(id: string, values: CompanyValues): Promise<Company> {
    const existing = await this.getCompany(id);
    const validValues = validateCompanyValues(values);
    await this.assertActiveOwner(validValues.ownerMemberId);

    const status = existing.status === "archived" ? "archived" : validValues.status;
    return this.companies.update({
      ...existing,
      ...validValues,
      status,
    });
  }

  async archiveCompany(id: string): Promise<Company> {
    const existing = await this.getCompany(id);
    return this.companies.update(archiveCompany(existing));
  }

  async setProspectingStage(id: string, prospectingStage: ProspectingStage | null) {
    if (prospectingStage && !PROSPECTING_STAGES.includes(prospectingStage))
      throw new CompanyValidationError("O estado de prospeção não é válido.");
    const existing = await this.getCompany(id);
    return this.companies.update({ ...existing, prospectingStage });
  }

  async setPrimaryContact(id: string, primaryContactId: string | null) {
    const existing = await this.getCompany(id);
    return this.companies.update({ ...existing, primaryContactId });
  }

  async deleteCompany(id: string): Promise<void> {
    const result = await this.companies.deleteIfUnreferenced(id);
    if (result === "not_found") throw new CompanyNotFoundError();
    if (result === "profiles") {
      throw new CompanyDeleteBlockedError(
        "Elimina ou move primeiro os Perfis associados a esta Organisation.",
      );
    }
    if (result === "protected") {
      throw new CompanyDeleteBlockedError(
        "Esta Organisation tem contexto operacional protegido e não pode ser eliminada.",
      );
    }
  }

  private async assertActiveOwner(ownerMemberId: string): Promise<void> {
    if (!(await this.members.isActive(ownerMemberId))) throw new CompanyOwnerError();
  }
}

export function getCompanyApplicationErrorMessage(error: unknown): string {
  if (
    error instanceof CompanyValidationError ||
    error instanceof CompanyOwnerError ||
    error instanceof CompanyNotFoundError ||
    error instanceof CompanyDeleteBlockedError
  ) {
    return error.message;
  }

  return "Não foi possível guardar a Organisation. Tenta novamente.";
}
