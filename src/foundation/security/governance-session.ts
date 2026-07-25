export const GOVERNANCE_COOKIE_NAME = "vouga_governance_unlock";
export const GOVERNANCE_SESSION_TTL_SECONDS = 10 * 60;

type GovernanceSessionPayload = Readonly<{
  exp: number;
  sub: string;
  v: 1;
}>;

export async function createGovernanceSession(
  userId: string,
  secret: string,
  nowMs = Date.now(),
): Promise<string> {
  const payload: GovernanceSessionPayload = {
    exp: Math.floor(nowMs / 1000) + GOVERNANCE_SESSION_TTL_SECONDS,
    sub: userId,
    v: 1,
  };
  const encodedPayload = encodeBytes(new TextEncoder().encode(JSON.stringify(payload)));
  const signature = await sign(encodedPayload, secret);
  return `${encodedPayload}.${signature}`;
}

export async function verifyGovernanceSession(
  token: string | undefined,
  userId: string | null,
  secret: string,
  nowMs = Date.now(),
): Promise<boolean> {
  if (!token || !userId) return false;
  const [encodedPayload, suppliedSignature, overflow] = token.split(".");
  if (!encodedPayload || !suppliedSignature || overflow) return false;

  const expectedSignature = await sign(encodedPayload, secret);
  if (!constantTimeEqual(suppliedSignature, expectedSignature)) return false;

  try {
    const payload = JSON.parse(
      new TextDecoder().decode(decodeBytes(encodedPayload)),
    ) as Partial<GovernanceSessionPayload>;
    return payload.v === 1
      && payload.sub === userId
      && typeof payload.exp === "number"
      && payload.exp > Math.floor(nowMs / 1000);
  } catch {
    return false;
  }
}

export function isGovernanceProtectedPath(_pathname: string): boolean {
  return false;
}

async function sign(payload: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { hash: "SHA-256", name: "HMAC" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return encodeBytes(new Uint8Array(signature));
}

function constantTimeEqual(left: string, right: string): boolean {
  const length = Math.max(left.length, right.length);
  let difference = left.length ^ right.length;
  for (let index = 0; index < length; index += 1) {
    difference |= (left.charCodeAt(index) || 0) ^ (right.charCodeAt(index) || 0);
  }
  return difference === 0;
}

function encodeBytes(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/u, "");
}

function decodeBytes(value: string): Uint8Array {
  const base64 = value.replaceAll("-", "+").replaceAll("_", "/");
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
  const binary = atob(padded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

