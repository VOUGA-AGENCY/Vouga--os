import { describe, expect, it, vi } from "vitest";
import type { MemberDirectory } from "@/application/members/contracts";
import type { Cost } from "@/domain/costs/cost";
import type { CashBalanceRepository, CostContextDirectory, CostRepository } from "./contracts";
import { CostService } from "./cost-service";

const recurringValues = {
  title: "Supabase",
  description: "Infraestrutura operacional.",
  category: "infrastructure" as const,
  expectedAmountMinor: 2500,
  currency: "EUR",
  costType: "recurring" as const,
  recurrence: "monthly" as const,
  startsOn: "2026-07-01",
  billingAnchorOn: "2026-07-15",
  ownerMemberId: "member",
};

describe("CostService", () => {
  it("creates and activates a recurring Cost through explicit commands", async () => {
    const repository = costRepository();
    const service = createService(repository);
    const created = await service.createCost(recurringValues);
    await service.activateCost(created.id);
    expect(repository.create).toHaveBeenCalledOnce();
    expect(repository.activate).toHaveBeenCalledOnce();
  });

  it("rejects an inactive owner before persistence", async () => {
    const repository = costRepository();
    const service = createService(repository, false);
    await expect(service.createCost(recurringValues)).rejects.toThrow("owner ativo");
    expect(repository.create).not.toHaveBeenCalled();
  });

  it("records a validated append-only cash snapshot through its repository", async () => {
    const balances = cashRepository();
    const service = createService(costRepository(), true, balances);
    await service.recordCashBalance({
      balanceMinor: 100_000,
      currency: "eur",
      confirmedAt: "2026-07-16T10:00:00Z",
      confirmedByMemberId: "member",
    });
    expect(balances.create).toHaveBeenCalledWith(
      expect.objectContaining({ balanceMinor: 100_000, currency: "EUR" }),
    );
  });
});

function createService(costs: CostRepository, active = true, balances = cashRepository()) {
  const members = {
    listActive: vi.fn().mockResolvedValue([]),
    isActive: vi.fn().mockResolvedValue(active),
  } as MemberDirectory;
  const contexts = {
    getOptions: vi.fn().mockResolvedValue({
      companies: [],
      roadmapItems: [],
      decisions: [],
      tasks: [],
    }),
    referencesExist: vi.fn().mockResolvedValue(true),
  } as CostContextDirectory;
  return new CostService(costs, balances, members, contexts);
}

function costRepository(): CostRepository {
  const cost: Cost = {
    id: "cost",
    title: recurringValues.title,
    description: recurringValues.description,
    category: recurringValues.category,
    supplier: null,
    expectedAmountMinor: recurringValues.expectedAmountMinor,
    actualAmountMinor: null,
    currency: recurringValues.currency,
    costType: recurringValues.costType,
    recurrence: recurringValues.recurrence,
    expectedOn: null,
    startsOn: recurringValues.startsOn,
    billingAnchorOn: recurringValues.billingAnchorOn,
    paidOn: null,
    endedOn: null,
    cancelledOn: null,
    status: "planned",
    ownerMemberId: "member",
    companyId: null,
    roadmapItemId: null,
    sourceDecisionId: null,
    taskIds: [],
    createdAt: "2026-07-01T00:00:00Z",
    updatedAt: "2026-07-01T00:00:00Z",
  };
  return {
    findById: vi.fn().mockResolvedValue(cost),
    create: vi.fn().mockResolvedValue(cost),
    update: vi.fn().mockResolvedValue(cost),
    activate: vi.fn().mockResolvedValue({ ...cost, status: "active" }),
    pay: vi.fn().mockResolvedValue(cost),
    end: vi.fn().mockResolvedValue(cost),
    cancel: vi.fn().mockResolvedValue(cost),
  };
}

function cashRepository(): CashBalanceRepository {
  return {
    create: vi.fn().mockImplementation(async (values) => ({
      id: "snapshot",
      ...values,
      confirmedByDisplayName: "Miguel",
      description: values.description ?? null,
      createdAt: values.confirmedAt,
    })),
  };
}
