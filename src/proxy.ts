import { type NextRequest, NextResponse } from "next/server";

import { getGovernanceSecurityEnv } from "@/foundation/config/governance-env";
import {
  GOVERNANCE_COOKIE_NAME,
  isGovernanceProtectedPath,
  verifyGovernanceSession,
} from "@/foundation/security/governance-session";
import { updateSession } from "@/persistence/supabase/update-session";

export async function proxy(request: NextRequest) {
  const { response, userId } = await updateSession(request);
  if (!isGovernanceProtectedPath(request.nextUrl.pathname)) return response;

  const env = getGovernanceSecurityEnv();
  const unlocked = env
    ? await verifyGovernanceSession(
        request.cookies.get(GOVERNANCE_COOKIE_NAME)?.value,
        userId,
        env.sessionSecret,
      )
    : false;
  if (unlocked) return response;

  const lockedUrl = new URL("/governance/locked", request.url);
  lockedUrl.searchParams.set("returnTo", `${request.nextUrl.pathname}${request.nextUrl.search}`);
  if (!env) lockedUrl.searchParams.set("configuration", "missing");
  const rewrite = NextResponse.rewrite(lockedUrl, { request });
  response.cookies.getAll().forEach((cookie) => rewrite.cookies.set(cookie));
  return rewrite;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"
  ]
};
