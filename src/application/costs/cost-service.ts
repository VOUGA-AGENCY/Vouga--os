import type { MemberDirectory } from "@/application/members/contracts";
import {
  CostTransitionError,
  CostValidationError,
  activateRecurringCost,
  assertCostEditable,
  cancelCost,
  endRecurringCost,
  payOneOffCost,
  type CostValues,
  validateCostValues,
} from "@/domain/costs/cost";
import type {
  CashBalanceRepository,
  CostContextDirectory,
  CostFormOptions,
  CostRepository,
} from "./contracts";

export class CostNotFoundError extends Error {
  constructor() {
    super("O Cost não existe.");
    this.name = "CostNotFoundError";
  }
}

export class CostReferenceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CostReferenceError";
  }
}

export class CostService {
  constructor(
    private readonly costs: CostRepository,
    private readonly balances: CashBalanceRepository,
    private readonly members: MemberDirectory,
    private readonly contexts: CostContextDirectory,
  ) {}

  async getFormOptions(): Promise<CostFormOptions> {
    const [members, contexts] = await Promise.all([
      this.members.listActive(),
      this.contexts.getOptions(),
    ]);
    return { members, ...contexts };
  }

  async getCost(id: string) {
    const cost = await this.costs.findById(id);
    if (!cost) throw new CostNotFoundError();
    return cost;
  }

  async createCost(values: CostValues) {
    const valid = validateCostValues(values);
    await this.assertReferences(valid);
    return this.costs.create(valid);
  }

  async updateCost(id: string, values: CostValues) {
    const cost = await this.getCost(id);
    const valid = validateCostValues(values);
    assertCostEditable(cost, valid);
    await this.assertReferences(valid);
    return this.costs.update(cost, valid);
  }

  async activateCost(id: string) {
    const cost = await this.getCost(id);
    activateRecurringCost(cost);
    return this.costs.activate(cost);
  }

  async payCost(id: string, actualAmountMinor: number, paidOn: string) {
    const cost = await this.getCost(id);
    payOneOffCost(cost, actualAmountMinor, paidOn);
    return this.costs.pay(cost, actualAmountMinor, paidOn);
  }

  async endCost(id: string, endedOn: string) {
    const cost = await this.getCost(id);
    endRecurringCost(cost, endedOn);
    return this.costs.end(cost, endedOn);
  }

  async cancelCost(id: string, cancelledOn: string) {
    const cost = await this.getCost(id);
    cancelCost(cost, cancelledOn);
    return this.costs.cancel(cost, cancelledOn);
  }

  async recordCashBalance(values: {
    balanceMinor: number;
    currency: string;
    confirmedAt: string;
    confirmedByMemberId: string;
    description?: string | null;
  }) {
    if (!Number.isSafeInteger(values.balanceMinor) || values.balanceMinor < 0) {
      throw new CostValidationError("O saldo confirmado não pode ser negativo.");
    }
    const currency = values.currency.trim().toUpperCase();
    if (!/^[A-Z]{3}$/.test(currency)) {
      throw new CostValidationError("A moeda deve usar um código ISO com três letras.");
    }
    const confirmedAt = new Date(values.confirmedAt);
    if (Number.isNaN(confirmedAt.getTime())) {
      throw new CostValidationError("A data de confirmação não é válida.");
    }
    if (!(await this.members.isActive(values.confirmedByMemberId))) {
      throw new CostReferenceError("Seleciona um membro ativo para confirmar o saldo.");
    }
    return this.balances.create({
      ...values,
      confirmedAt: confirmedAt.toISOString(),
      currency,
    });
  }

  private async assertReferences(values: ReturnType<typeof validateCostValues>) {
    if (values.ownerMemberId && !(await this.members.isActive(values.ownerMemberId))) {
      throw new CostReferenceError("Seleciona um owner ativo.");
    }
    if (!(await this.contexts.referencesExist(values))) {
      throw new CostReferenceError("Uma das relações selecionadas já não existe.");
    }
  }
}

export function getCostApplicationErrorMessage(error: unknown) {
  if (
    error instanceof CostValidationError ||
    error instanceof CostTransitionError ||
    error instanceof CostNotFoundError ||
    error instanceof CostReferenceError
  ) {
    return error.message;
  }
  return "Não foi possível guardar o Cost. Tenta novamente.";
}
