import { describe, expect, it } from "vitest";

import {
  DecisionRevisionError,
  statusAfterRevision,
  validateDecisionRevision,
  validateDecisionValues,
} from "./decision";

const values = {
  title: "Manter o acesso fechado",
  choice: "Provisionar utilizadores manualmente.",
  reason: "A V1 ainda não precisa de signup público.",
  impact: "O acesso continua reservado à equipa fundadora.",
  authorityMemberId: "member-1",
  decidedOn: "2026-07-16",
};

describe("Decision", () => {
  it("exige escolha material, motivo, impacto, autoridade e data", () => {
    expect(() => validateDecisionValues({ ...values, choice: "" })).toThrow("escolha");
    expect(() => validateDecisionValues({ ...values, reason: "" })).toThrow("motivo");
    expect(() => validateDecisionValues({ ...values, impact: "" })).toThrow("impacto");
    expect(() => validateDecisionValues({ ...values, authorityMemberId: "" })).toThrow(
      "autoridade",
    );
    expect(() => validateDecisionValues({ ...values, decidedOn: "2026-02-31" })).toThrow(
      "data",
    );
  });

  it("mantém alternativas opcionais e inclui a Meeting de origem no contexto", () => {
    const result = validateDecisionValues({
      ...values,
      alternatives: "  ",
      originMeetingId: "meeting-1",
      meetingIds: ["meeting-2"],
    });
    expect(result.alternatives).toBeNull();
    expect(result.meetingIds).toEqual(["meeting-2", "meeting-1"]);
  });

  it("distingue substituir, limitar e revogar", () => {
    expect(statusAfterRevision("current", "supersedes")).toBe("superseded");
    expect(statusAfterRevision("current", "limits")).toBe("current");
    expect(statusAfterRevision("current", "revokes")).toBe("revoked");
  });

  it("rejeita autorreferência, efeito inválido e revisão de estado terminal", () => {
    expect(() => validateDecisionRevision("same", "same", "limits")).toThrow(
      DecisionRevisionError,
    );
    expect(() => validateDecisionRevision("new", "old", "changes")).toThrow(
      DecisionRevisionError,
    );
    expect(() => statusAfterRevision("revoked", "limits")).toThrow(DecisionRevisionError);
  });
});
