import { describe, expect, it } from "vitest";
import { assertHorizonChangeHasDecision, assertRoadmapItemEditable, validateRoadmapItemValues, type RoadmapItem } from "./roadmap-item";

const item: RoadmapItem = { id: "r1", title: "Problema", kind: "problem", description: "Descrição", evidence: "Evidência", horizon: "next", lifecycleStatus: "active", ownerMemberId: null, companyIds: [], taskIds: [], sprintIds: [], decisionIds: [], createdAt: "", updatedAt: "" };

describe("Roadmap Item", () => {
  it("aceita apenas intenção completa e deduplica relações", () => {
    const values = validateRoadmapItemValues({ title: " Resultado ", kind: "outcome", description: " Descrição ", evidence: " Evidência ", horizon: "next", taskIds: ["t1", "t1"] });
    expect(values).toMatchObject({ title: "Resultado", description: "Descrição", evidence: "Evidência", taskIds: ["t1"], ownerMemberId: null });
  });
  it("exige owner em Now", () => {
    expect(() => validateRoadmapItemValues({ title: "X", kind: "problem", description: "D", evidence: "E", horizon: "now" })).toThrow("precisa de owner");
  });
  it("rejeita evidência vazia e enumerações externas", () => {
    expect(() => validateRoadmapItemValues({ title: "X", kind: "problem", description: "D", evidence: " ", horizon: "next" })).toThrow("evidência");
    expect(() => validateRoadmapItemValues({ title: "X", kind: "project" as "problem", description: "D", evidence: "E", horizon: "next" })).toThrow("tipo");
    expect(() => validateRoadmapItemValues({ title: "X", kind: "problem", description: "D", evidence: "E", horizon: "quarter" as "next" })).toThrow("horizonte");
  });
  it("exige Decision quando muda de horizonte", () => {
    const values = validateRoadmapItemValues({ title: "X", kind: "problem", description: "D", evidence: "E", horizon: "now", ownerMemberId: "m1", taskIds: ["t1"] });
    expect(() => assertHorizonChangeHasDecision(item, values)).toThrow("Decision");
    expect(() => assertHorizonChangeHasDecision(item, { ...values, decisionIds: ["d1"] })).not.toThrow();
  });
  it("não reabre estados terminais por edição", () => {
    expect(() => assertRoadmapItemEditable({ ...item, lifecycleStatus: "completed" })).toThrow("já não pode ser editado");
  });
  it("exige movimento executável em Now", () => {
    expect(() => validateRoadmapItemValues({ title: "X", kind: "problem", description: "D", evidence: "E", horizon: "now", ownerMemberId: "m1" })).toThrow("Task relacionada");
  });
});
