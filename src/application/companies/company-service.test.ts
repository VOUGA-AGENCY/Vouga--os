import { describe, expect, it } from "vitest";

import type { ActiveMember, CompanyRepository, MemberDirectory } from "./contracts";
import { CompanyOwnerError, CompanyService } from "./company-service";
import type { Company, ValidCompanyValues } from "@/domain/companies/company";

class MemoryCompanyRepository implements CompanyRepository {
  private records: Company[] = [];

  list(): Promise<Company[]> {
    return Promise.resolve([...this.records]);
  }

  findById(id: string): Promise<Company | null> {
    return Promise.resolve(this.records.find((company) => company.id === id) ?? null);
  }

  create(values: ValidCompanyValues): Promise<Company> {
    const company: Company = {
      id: `company-${this.records.length + 1}`,
      ...values,
      createdAt: "2026-07-15T00:00:00.000Z",
      updatedAt: "2026-07-15T00:00:00.000Z",
    };
    this.records.push(company);
    return Promise.resolve(company);
  }

  update(company: Company): Promise<Company> {
    this.records = this.records.map((record) => (record.id === company.id ? company : record));
    return Promise.resolve(company);
  }

  deleteIfUnreferenced(id: string): Promise<"deleted" | "profiles" | "protected" | "not_found"> {
    const exists = this.records.some((company) => company.id === id);
    this.records = this.records.filter((company) => company.id !== id);
    return Promise.resolve(exists ? "deleted" : "not_found");
  }
}

class MemoryMemberDirectory implements MemberDirectory {
  constructor(private readonly activeMembers: ActiveMember[]) {}

  listActive(): Promise<ActiveMember[]> {
    return Promise.resolve(this.activeMembers);
  }

  isActive(id: string): Promise<boolean> {
    return Promise.resolve(this.activeMembers.some((member) => member.id === id));
  }
}

const owner: ActiveMember = {
  id: "member-1",
  displayName: "Founder",
  email: "founder@example.com",
};

const companyContact = { primaryCae: "62010", contactEmail: "geral@empresa.pt" };

function createService() {
  return new CompanyService(new MemoryCompanyRepository(), new MemoryMemberDirectory([owner]));
}

describe("CompanyService", () => {
  it("cria, lista e abre a mesma Company através do contrato", async () => {
    const service = createService();
    const created = await service.createCompany({
      name: "Organização Externa",
      status: "active",
      ownerMemberId: owner.id,
      ...companyContact,
    });

    await expect(service.listCompanies()).resolves.toEqual([created]);
    await expect(service.getCompany(created.id)).resolves.toEqual(created);
  });

  it("rejeita owner inexistente ou inativo", async () => {
    const service = createService();
    await expect(
      service.createCompany({
        name: "Organização Externa",
        status: "active",
        ownerMemberId: "member-inactive",
        ...companyContact,
      }),
    ).rejects.toBeInstanceOf(CompanyOwnerError);
  });

  it("atualiza identidade, estado, owner e campos opcionais", async () => {
    const service = createService();
    const created = await service.createCompany({
      name: "Organização Externa",
      status: "active",
      ownerMemberId: owner.id,
      ...companyContact,
    });

    const updated = await service.updateCompany(created.id, {
      name: "Organização Atualizada",
      status: "inactive",
      ownerMemberId: owner.id,
      ...companyContact,
      currentContext: "Relação em pausa",
      relationshipRisks: "Sem sponsor interno",
    });

    expect(updated).toMatchObject({
      name: "Organização Atualizada",
      status: "inactive",
      currentContext: "Relação em pausa",
      relationshipRisks: "Sem sponsor interno",
    });
  });

  it("arquiva por mudança de estado e mantém o registo consultável", async () => {
    const service = createService();
    const created = await service.createCompany({
      name: "Organização Externa",
      status: "active",
      ownerMemberId: owner.id,
      ...companyContact,
    });

    const archived = await service.archiveCompany(created.id);

    expect(archived.status).toBe("archived");
    await expect(service.getCompany(created.id)).resolves.toEqual(archived);
  });

  it("não reativa implicitamente uma Company arquivada através da edição genérica", async () => {
    const service = createService();
    const created = await service.createCompany({
      name: "Organização Externa",
      status: "active",
      ownerMemberId: owner.id,
      ...companyContact,
    });
    await service.archiveCompany(created.id);

    const edited = await service.updateCompany(created.id, {
      name: "Organização Externa Renomeada",
      status: "active",
      ownerMemberId: owner.id,
      ...companyContact,
    });

    expect(edited.status).toBe("archived");
    expect(edited.name).toBe("Organização Externa Renomeada");
  });

  it("elimina uma Organisation sem referências através do contrato explícito", async () => {
    const service = createService();
    const created = await service.createCompany({
      name: "Organização Temporária",
      status: "active",
      ownerMemberId: owner.id,
      ...companyContact,
    });

    await service.deleteCompany(created.id);

    await expect(service.getCompany(created.id)).rejects.toThrow("A Organisation não existe.");
  });
});
