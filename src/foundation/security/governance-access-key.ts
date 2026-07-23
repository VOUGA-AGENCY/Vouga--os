import "server-only";

import { scrypt as nodeScrypt, timingSafeEqual } from "node:crypto";
const MAX_ACCESS_KEY_LENGTH = 256;

export async function verifyGovernanceAccessKey(
  candidate: string,
  encodedHash: string,
): Promise<boolean> {
  if (!candidate || candidate.length > MAX_ACCESS_KEY_LENGTH) return false;
  const parsed = parseHash(encodedHash);
  if (!parsed) return false;

  try {
    const derived = await derive(candidate, parsed.salt, parsed.hash.length, {
      N: parsed.cost,
      p: parsed.parallelization,
      r: parsed.blockSize,
      maxmem: 64 * 1024 * 1024,
    });
    return timingSafeEqual(derived, parsed.hash);
  } catch {
    return false;
  }
}

function derive(
  candidate: string,
  salt: Buffer,
  length: number,
  options: { N: number; p: number; r: number; maxmem: number },
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    nodeScrypt(candidate, salt, length, options, (error, key) => {
      if (error) reject(error);
      else resolve(key);
    });
  });
}

function parseHash(encoded: string) {
  const [marker, algorithm, cost, blockSize, parallelization, salt, hash, overflow] =
    encoded.split("$");
  if (marker !== "" || algorithm !== "scrypt" || overflow) return null;

  const parsedCost = Number(cost);
  const parsedBlockSize = Number(blockSize);
  const parsedParallelization = Number(parallelization);
  if (
    !Number.isInteger(parsedCost)
    || !Number.isInteger(parsedBlockSize)
    || !Number.isInteger(parsedParallelization)
    || parsedCost < 16_384
    || parsedBlockSize < 8
    || parsedParallelization < 1
    || !salt
    || !hash
  ) return null;

  const decodedHash = Buffer.from(hash, "base64url");
  if (decodedHash.length < 32) return null;
  return {
    blockSize: parsedBlockSize,
    cost: parsedCost,
    hash: decodedHash,
    parallelization: parsedParallelization,
    salt: Buffer.from(salt, "base64url"),
  };
}
