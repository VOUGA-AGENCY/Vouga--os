import { describe, expect, test } from "vitest";
import { validateContactValues } from "./contact";
describe("Contact", () => {
  test("normaliza identidade externa e endpoints opcionais", () => {
    expect(
      validateContactValues({
        displayName: "  Ana Silva ",
        ownerMemberId: "member-1",
        relationshipRole: "advisor",
        email: " ANA@EXAMPLE.COM ",
      }),
    ).toMatchObject({ displayName: "Ana Silva", email: "ana@example.com", companyId: null });
  });
  test("rejeita URLs que não preservam as fronteiras aprovadas", () => {
    expect(() =>
      validateContactValues({
        displayName: "Ana",
        ownerMemberId: "member-1",
        relationshipRole: "advisor",
        linkedinUrl: "http://linkedin.com/in/ana",
      }),
    ).toThrow("HTTPS");
  });
  test("aceita fotografia importada como data URL controlado", () => {
    expect(
      validateContactValues({
        displayName: "Ana",
        ownerMemberId: "member-1",
        relationshipRole: "advisor",
        avatarUrl: "data:image/jpeg;base64,abc",
      }),
    ).toMatchObject({ avatarUrl: "data:image/jpeg;base64,abc" });
  });
});
