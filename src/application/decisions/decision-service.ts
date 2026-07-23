import type { MemberDirectory } from "@/application/members/contracts";
import {
  DecisionRevisionError,
  type DecisionReviewEffect,
  type DecisionValues,
  DecisionValidationError,
  statusAfterRevision,
  validateDecisionRevision,
  validateDecisionValues,
} from "@/domain/decisions/decision";

import type {
  DecisionContextDirectory,
  DecisionFormOptions,
  DecisionRepository,
} from "./contracts";

export class DecisionNotFoundError extends Error {
  constructor() {
    super("A Decision não existe.");
    this.name = "DecisionNotFoundError";
  }
}

export class DecisionReferenceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DecisionReferenceError";
  }
}

export class DecisionService {
  constructor(
    private readonly decisions: DecisionRepository,
    private readonly members: MemberDirectory,
    private readonly contexts: DecisionContextDirectory,
    private readonly newId: () => string = () => crypto.randomUUID(),
  ) {}

  async getFormOptions(): Promise<DecisionFormOptions> {
    const [members, companies, meetings, tasks] = await Promise.all([
      this.members.listActive(),
      this.contexts.listCompanies(),
      this.contexts.listMeetings(),
      this.contexts.listTasks(),
    ]);
    return { members, companies, meetings, tasks };
  }

  async getDecision(id: string) {
    const decision = await this.decisions.findById(id);
    if (!decision) throw new DecisionNotFoundError();
    return decision;
  }

  async createDecision(values: DecisionValues) {
    const valid = validateDecisionValues(values);
    await this.assertReferences(valid);
    return this.decisions.create(this.newId(), valid, null);
  }

  async reviewDecision(
    previousDecisionId: string,
    effect: DecisionReviewEffect,
    values: DecisionValues,
  ) {
    const previous = await this.getDecision(previousDecisionId);
    statusAfterRevision(previous.status, effect);
    const id = this.newId();
    const revision = validateDecisionRevision(id, previous.id, effect);
    const valid = validateDecisionValues(values);
    await this.assertReferences(valid);
    return this.decisions.create(id, valid, revision);
  }

  private async assertReferences(values: ReturnType<typeof validateDecisionValues>) {
    if (!(await this.members.isActive(values.authorityMemberId))) {
      throw new DecisionReferenceError("Seleciona uma autoridade ativa.");
    }
    const [companiesExist, meetingsExist, tasksExist] = await Promise.all([
      this.contexts.companiesExist(values.companyIds),
      this.contexts.meetingsExist(values.meetingIds),
      this.contexts.tasksExist(values.taskIds),
    ]);
    if (!companiesExist) {
      throw new DecisionReferenceError("Uma das Organisations selecionadas já não existe.");
    }
    if (!meetingsExist) {
      throw new DecisionReferenceError("Uma das Meetings selecionadas já não existe.");
    }
    if (!tasksExist) {
      throw new DecisionReferenceError("Uma das Tasks selecionadas já não existe.");
    }
  }
}

export function getDecisionApplicationErrorMessage(error: unknown): string {
  if (
    error instanceof DecisionValidationError ||
    error instanceof DecisionRevisionError ||
    error instanceof DecisionNotFoundError ||
    error instanceof DecisionReferenceError
  ) {
    return error.message;
  }
  return "Não foi possível guardar a Decision. Tenta novamente.";
}
