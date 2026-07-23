import type { MemberDirectory } from "@/application/members/contracts";
import { assertCanFinishRoadmapItem, assertHorizonChangeHasDecision, assertRoadmapItemEditable, RoadmapTransitionError, RoadmapValidationError, type RoadmapItemValues, validateRoadmapItemValues } from "@/domain/roadmap/roadmap-item";
import type { RoadmapContextDirectory, RoadmapFormOptions, RoadmapItemRepository } from "./contracts";

export class RoadmapItemNotFoundError extends Error {
  constructor() { super("O Roadmap Item não existe."); this.name = "RoadmapItemNotFoundError"; }
}
export class RoadmapReferenceError extends Error {
  constructor(message: string) { super(message); this.name = "RoadmapReferenceError"; }
}

export class RoadmapService {
  constructor(private readonly items: RoadmapItemRepository, private readonly members: MemberDirectory, private readonly contexts: RoadmapContextDirectory) {}
  async getFormOptions(): Promise<RoadmapFormOptions> {
    const [members, contexts] = await Promise.all([this.members.listActive(), this.contexts.getOptions()]);
    return { members, ...contexts };
  }
  async getItem(id: string) {
    const item = await this.items.findById(id);
    if (!item) throw new RoadmapItemNotFoundError();
    return item;
  }
  async createItem(values: RoadmapItemValues) {
    const valid = validateRoadmapItemValues(values);
    await this.assertReferences(valid);
    return this.items.create(valid);
  }
  async updateItem(id: string, values: RoadmapItemValues) {
    const item = await this.getItem(id);
    assertRoadmapItemEditable(item);
    const valid = validateRoadmapItemValues(values);
    assertHorizonChangeHasDecision(item, valid);
    await this.assertReferences(valid);
    return this.items.update(item, valid);
  }
  async completeItem(id: string) {
    const item = await this.getItem(id);
    assertCanFinishRoadmapItem(item);
    return this.items.finish(item, "completed");
  }
  async abandonItem(id: string) {
    const item = await this.getItem(id);
    assertCanFinishRoadmapItem(item);
    return this.items.finish(item, "abandoned");
  }
  private async assertReferences(values: ReturnType<typeof validateRoadmapItemValues>) {
    if (values.ownerMemberId && !(await this.members.isActive(values.ownerMemberId))) throw new RoadmapReferenceError("Seleciona um owner ativo.");
    if (!(await this.contexts.referencesExist(values))) throw new RoadmapReferenceError("Uma das relações selecionadas já não existe.");
  }
}

export function getRoadmapApplicationErrorMessage(error: unknown) {
  if (error instanceof RoadmapValidationError || error instanceof RoadmapTransitionError || error instanceof RoadmapItemNotFoundError || error instanceof RoadmapReferenceError) return error.message;
  return "Não foi possível guardar o Roadmap Item. Tenta novamente.";
}
