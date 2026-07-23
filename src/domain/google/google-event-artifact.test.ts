import { describe, expect, it } from "vitest";

import {
  GoogleEventArtifactValidationError,
  validateGoogleEventArtifact,
} from "./google-event-artifact";

const identity = {
  calendarId: "primary",
  googleEventId: "event-1",
  memberId: "member-1",
};

describe("GoogleEventArtifact", () => {
  it("guarda apenas classificação e contexto local", () => {
    expect(
      validateGoogleEventArtifact(
        identity,
        {
          classification: "meeting",
          companyIds: ["company-1", "company-1"],
          participantMemberIds: ["member-1"],
          taskIds: ["task-1"],
          notes: "Contexto interno",
          output: "Próximos passos acordados",
        },
        "2026-07-19T20:00:00.000Z",
      ),
    ).toEqual({
      ...identity,
      classification: "meeting",
      companyIds: ["company-1"],
      contactIds: [],
      participantMemberIds: ["member-1"],
      taskIds: ["task-1"],
      notes: "Contexto interno",
      output: "Próximos passos acordados",
      outputAt: "2026-07-19T20:00:00.000Z",
      ownerMemberId: null,
      purpose: null,
    });
  });

  it("não inventa classificação e só permite output em Meeting", () => {
    expect(
      validateGoogleEventArtifact(identity, {}, "2026-07-19T20:00:00.000Z").classification,
    ).toBeNull();
    expect(() =>
      validateGoogleEventArtifact(
        identity,
        { classification: "event", output: "Não permitido", participantMemberIds: ["member-1"] },
        "2026-07-19T20:00:00.000Z",
      ),
    ).toThrow(GoogleEventArtifactValidationError);
  });
});
