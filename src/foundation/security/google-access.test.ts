import { describe, expect, test } from "vitest";
import { canManageGoogle } from "./google-access";

describe("Google management access", () => {
  test("is exclusive to admins", () => {
    expect(canManageGoogle("admin")).toBe(true);
    expect(canManageGoogle("engineer")).toBe(false);
  });
});
