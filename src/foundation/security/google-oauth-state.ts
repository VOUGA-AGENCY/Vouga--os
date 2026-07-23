export const GOOGLE_OAUTH_STATE_COOKIE = "vouga_google_oauth_state";
export const GOOGLE_OAUTH_STATE_TTL_SECONDS = 10 * 60;

type GoogleOAuthStatePayload = Readonly<{
  exp: number;
  flow?: "connection" | "picker";
  nonce: string;
  sub: string;
  v: 1;
}>;

export async function createGoogleOAuthState(
  userId: string,
  encryptionSecret: string,
  nowMs = Date.now(),
  flow: GoogleOAuthStatePayload["flow"] = "connection",
): Promise<string> {
  const payload: GoogleOAuthStatePayload = {
    exp: Math.floor(nowMs / 1000) + GOOGLE_OAUTH_STATE_TTL_SECONDS,
    flow,
    nonce: encodeBytes(crypto.getRandomValues(new Uint8Array(24))),
    sub: userId,
    v: 1,
  };
  const encoded = encodeBytes(new TextEncoder().encode(JSON.stringify(payload)));
  return `${encoded}.${await sign(encoded, encryptionSecret)}`;
}

export async function verifyGoogleOAuthState(
  token: string | undefined,
  cookieToken: string | undefined,
  userId: string,
  encryptionSecret: string,
  nowMs = Date.now(),
): Promise<boolean> {
  if (!token || !cookieToken || token !== cookieToken) return false;
  const [encoded, suppliedSignature, overflow] = token.split(".");
  if (!encoded || !suppliedSignature || overflow) return false;

  const expectedSignature = await sign(encoded, encryptionSecret);
  if (!constantTimeEqual(suppliedSignature, expectedSignature)) return false;

  try {
    const payload = JSON.parse(
      new TextDecoder().decode(decodeBytes(encoded)),
    ) as Partial<GoogleOAuthStatePayload>;
    return (
      payload.v === 1 &&
      payload.sub === userId &&
      (!payload.flow || payload.flow === "connection" || payload.flow === "picker") &&
      typeof payload.nonce === "string" &&
      payload.nonce.length >= 24 &&
      typeof payload.exp === "number" &&
      payload.exp > Math.floor(nowMs / 1000)
    );
  } catch {
    return false;
  }
}

export function getGoogleOAuthStateFlow(token: string | undefined): "connection" | "picker" {
  if (!token) return "connection";
  const [encoded] = token.split(".");
  if (!encoded) return "connection";
  try {
    const payload = JSON.parse(
      new TextDecoder().decode(decodeBytes(encoded)),
    ) as Partial<GoogleOAuthStatePayload>;
    return payload.flow === "picker" ? "picker" : "connection";
  } catch {
    return "connection";
  }
}

async function sign(payload: string, encryptionSecret: string): Promise<string> {
  const derivedSecret = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(`google-oauth-state:${encryptionSecret}`),
  );
  const key = await crypto.subtle.importKey(
    "raw",
    derivedSecret,
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
  return Buffer.from(bytes).toString("base64url");
}

function decodeBytes(value: string): Uint8Array {
  return Uint8Array.from(Buffer.from(value, "base64url"));
}
