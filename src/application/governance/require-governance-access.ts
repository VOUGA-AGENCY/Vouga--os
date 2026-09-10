import "server-only";

import { redirect } from "next/navigation";
import { getAuthenticatedUser } from "@/application/auth/current-user";

export async function requireGovernanceAccess(returnTo?: string): Promise<void> {
  const user = await getAuthenticatedUser();
  if (!user) {
    redirect(returnTo ? `/login?returnTo=${encodeURIComponent(returnTo)}` : "/login");
  }
  if (user.role !== "admin") {
    redirect("/");
  }
}

