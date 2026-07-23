import { describe, expect, it } from "vitest";
import type { MemberDirectory } from "@/application/members/contracts";
import type { RoadmapItem } from "@/domain/roadmap/roadmap-item";
import type { RoadmapContextDirectory, RoadmapItemRepository } from "./contracts";
import { RoadmapService } from "./roadmap-service";

const base: RoadmapItem = { id: "r1", title: "Item", kind: "problem", description: "Descrição", evidence: "Evidência", horizon: "next", lifecycleStatus: "active", ownerMemberId: null, companyIds: [], taskIds: [], sprintIds: [], decisionIds: [], createdAt: "", updatedAt: "" };
class Repo implements RoadmapItemRepository {
  item = base;
  findById() { return Promise.resolve(this.item); }
  create(values: Parameters<RoadmapItemRepository["create"]>[0]) { this.item = { ...base, ...values }; return Promise.resolve(this.item); }
  update(_: RoadmapItem, values: Parameters<RoadmapItemRepository["update"]>[1]) { this.item = { ...this.item, ...values }; return Promise.resolve(this.item); }
  finish(_: RoadmapItem, status: "completed" | "abandoned") { this.item = { ...this.item, lifecycleStatus: status }; return Promise.resolve(this.item); }
}
const members: MemberDirectory = { listActive: async () => [{ id: "m1", displayName: "Miguel", email: "m@x.pt" }], isActive: async (id) => id === "m1" };
const contexts: RoadmapContextDirectory = { getOptions: async () => ({ companies: [], tasks: [], sprints: [], decisions: [] }), referencesExist: async () => true };

describe("RoadmapService", () => {
  it("cria e conclui sem transformar relações em cópias", async () => {
    const service = new RoadmapService(new Repo(), members, contexts);
    const created = await service.createItem({ title: "Problema", kind: "problem", description: "Descrição", evidence: "Evidência", horizon: "next", taskIds: ["t1"] });
    expect(created.taskIds).toEqual(["t1"]);
    expect((await service.completeItem(created.id)).lifecycleStatus).toBe("completed");
  });
  it("rejeita mudança de horizonte sem Decision", async () => {
    const service = new RoadmapService(new Repo(), members, contexts);
    await expect(service.updateItem("r1", { title: "Item", kind: "problem", description: "Descrição", evidence: "Evidência", horizon: "now", ownerMemberId: "m1", taskIds: ["t1"] })).rejects.toThrow("Decision");
  });
  it("edita com Decision e abandona preservando a entidade", async () => {
    const repository = new Repo();
    const service = new RoadmapService(repository, members, contexts);
    const updated = await service.updateItem("r1", { title: "Item revisto", kind: "hypothesis", description: "Descrição", evidence: "Nova evidência", horizon: "now", ownerMemberId: "m1", taskIds: ["t1"], decisionIds: ["d1"] });
    expect(updated).toMatchObject({ title: "Item revisto", horizon: "now", decisionIds: ["d1"] });
    expect((await service.abandonItem(updated.id)).lifecycleStatus).toBe("abandoned");
  });
});
