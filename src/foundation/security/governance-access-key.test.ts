import { scrypt as nodeScrypt } from "node:crypto";

import { describe, expect, it } from "vitest";

import { verifyGovernanceAccessKey } from "./governance-access-key";

describe("Governance access key", () => {
  it("verifies only the key represented by a valid slow hash", async () => {
    const salt = Buffer.from("fixed-governance-test-salt");
    const hash = await derive("test-access-key", salt);
    const encoded = `$scrypt$16384$8$1$${salt.toString("base64url")}$${hash.toString("base64url")}`;

    expect(await verifyGovernanceAccessKey("test-access-key", encoded)).toBe(true);
    expect(await verifyGovernanceAccessKey("wrong-key", encoded)).toBe(false);
    expect(await verifyGovernanceAccessKey("test-access-key", "invalid")).toBe(false);
  });
});

function derive(candidate: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    nodeScrypt(candidate, salt, 32, { N: 16_384, p: 1, r: 8 }, (error, key) => {
      if (error) reject(error);
      else resolve(key);
    });
  });
}
