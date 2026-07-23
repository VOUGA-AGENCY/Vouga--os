import { describe, expect, test } from "vitest";

import { createGoogleOAuthState, verifyGoogleOAuthState } from "./google-oauth-state";

const SECRET = Buffer.alloc(32, 9).toString("base64");

describe("Google OAuth state", () => {
  test("fica ligado ao browser, Member e prazo", async () => {
    const now = Date.parse("2026-07-19T16:00:00.000Z");
    const state = await createGoogleOAuthState("member-1", SECRET, now);

    await expect(verifyGoogleOAuthState(state, state, "member-1", SECRET, now)).resolves.toBe(true);
    await expect(verifyGoogleOAuthState(state, state, "member-2", SECRET, now)).resolves.toBe(
      false,
    );
    await expect(verifyGoogleOAuthState(state, "other", "member-1", SECRET, now)).resolves.toBe(
      false,
    );
    await expect(
      verifyGoogleOAuthState(state, state, "member-1", SECRET, now + 11 * 60 * 1000),
    ).resolves.toBe(false);
  });

  test("rejeita adulteração", async () => {
    const state = await createGoogleOAuthState("member-1", SECRET);
    const tampered = `${state.slice(0, -1)}x`;
    await expect(verifyGoogleOAuthState(tampered, tampered, "member-1", SECRET)).resolves.toBe(
      false,
    );
  });
});
