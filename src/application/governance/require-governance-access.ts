import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { getAuthenticatedUser } from "@/application/auth/current-user";
import { getGovernanceSecurityEnv } from "@/foundation/config/governance-env";
import {
  GOVERNANCE_COOKIE_NAME,
  verifyGovernanceSession,
} from "@/foundation/security/governance-session";

export async function requireGovernanceAccess(returnTo: string): Promise<void> {
  const [user, cookieStore] = await Promise.all([getAuthenticatedUser(), cookies()]);
  const env = getGovernanceSecurityEnv();
  const unlocked = env
    ? await verifyGovernanceSession(
        cookieStore.get(GOVERNANCE_COOKIE_NAME)?.value,
        user?.id ?? null,
        env.sessionSecret,
      )
    : false;

  if (!unlocked) {
    redirect(`/governance/locked?returnTo=${encodeURIComponent(safeReturnTo(returnTo))}`);
  }
}

function safeReturnTo(value: string) {
  const pathname = value.split("?")[0];
  return ["/governance", "/costs", "/vault"].some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  ) ? value : "/governance";
}

