import { NextResponse } from "next/server";

import { getAuthenticatedUser } from "@/application/auth/current-user";
import { getGovernanceSecurityEnv } from "@/foundation/config/governance-env";
import { verifyGovernanceAccessKey } from "@/foundation/security/governance-access-key";
import {
  createGovernanceSession,
  GOVERNANCE_COOKIE_NAME,
  GOVERNANCE_SESSION_TTL_SECONDS,
} from "@/foundation/security/governance-session";

const ATTEMPT_WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const attempts = new Map<string, { count: number; windowStartedAt: number }>();

export async function POST(request: Request) {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ ok: false }, { status: 401 });

  const now = Date.now();
  const current = attempts.get(user.id);
  if (current && now - current.windowStartedAt < ATTEMPT_WINDOW_MS && current.count >= MAX_ATTEMPTS) {
    return NextResponse.json({ ok: false, retryAfterSeconds: 60 }, {
      headers: { "Retry-After": "60" },
      status: 429,
    });
  }

  const env = getGovernanceSecurityEnv();
  if (!env) {
    return NextResponse.json({ configuration: "missing", ok: false }, { status: 503 });
  }

  const body = await request.json().catch(() => null) as { accessKey?: unknown } | null;
  const accessKey = typeof body?.accessKey === "string" ? body.accessKey : "";
  const valid = await verifyGovernanceAccessKey(accessKey, env.accessKeyHash);
  if (!valid) {
    const next = current && now - current.windowStartedAt < ATTEMPT_WINDOW_MS
      ? { count: current.count + 1, windowStartedAt: current.windowStartedAt }
      : { count: 1, windowStartedAt: now };
    attempts.set(user.id, next);
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  attempts.delete(user.id);
  const token = await createGovernanceSession(user.id, env.sessionSecret, now);
  const response = NextResponse.json({ ok: true });
  response.cookies.set(GOVERNANCE_COOKIE_NAME, token, {
    httpOnly: true,
    maxAge: GOVERNANCE_SESSION_TTL_SECONDS,
    path: "/",
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
  });
  return response;
}

