import { describe, expect, test } from "vitest";

import { createGoogleConnection, InvalidGoogleConnectionError } from "./google-connection";

describe("GoogleConnection", () => {
  test("normaliza a identidade e elimina scopes duplicados", () => {
    const connection = createGoogleConnection({
      email: " Miguel@Vouga-Agency.pt ",
      memberId: "member-1",
      now: "2026-07-19T16:00:00.000Z",
      providerSubject: "google-subject",
      scopes: ["scope-b", "scope-a", "scope-b"],
    });

    expect(connection.email).toBe("miguel@vouga-agency.pt");
    expect(connection.scopes).toEqual(["scope-a", "scope-b"]);
    expect(connection.status).toBe("active");
  });

  test("rejeita uma identidade Google incompleta", () => {
    expect(() =>
      createGoogleConnection({
        email: "invalid",
        memberId: "member-1",
        now: "2026-07-19T16:00:00.000Z",
        providerSubject: "",
        scopes: [],
      }),
    ).toThrow(InvalidGoogleConnectionError);
  });
});
