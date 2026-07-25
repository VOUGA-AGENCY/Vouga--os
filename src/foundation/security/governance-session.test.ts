import { describe, expect, it } from "vitest";

import {
  createGovernanceSession,
  GOVERNANCE_SESSION_TTL_SECONDS,
  isGovernanceProtectedPath,
  verifyGovernanceSession,
} from "./governance-session";

const secret = "governance-test-secret-with-at-least-32-characters";
const now = Date.UTC(2026, 6, 19, 12, 0, 0);

describe("Governance session", () => {
  it("binds a signed session to one user for ten minutes", async () => {
    const token = await createGovernanceSession("member-1", secret, now);

    expect(await verifyGovernanceSession(token, "member-1", secret, now)).toBe(true);
    expect(await verifyGovernanceSession(token, "member-2", secret, now)).toBe(false);
    expect(
      await verifyGovernanceSession(
        token,
        "member-1",
        secret,
        now + GOVERNANCE_SESSION_TTL_SECONDS * 1000,
      ),
    ).toBe(false);
  });

  it("rejects tampered tokens", async () => {
    const token = await createGovernanceSession("member-1", secret, now);

    expect(await verifyGovernanceSession(`${token}x`, "member-1", secret, now)).toBe(false);
  });

  it("allows open access across all workspace routes", () => {
    expect(isGovernanceProtectedPath("/governance")).toBe(false);
    expect(isGovernanceProtectedPath("/costs/cost-1/edit")).toBe(false);
    expect(isGovernanceProtectedPath("/vault")).toBe(false);
    expect(isGovernanceProtectedPath("/calendar")).toBe(false);
  });
});
