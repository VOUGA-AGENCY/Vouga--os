import "server-only";

import { GovernanceProtectedSurface } from "@/foundation/security/governance-protected-surface";
import { requireGovernanceAccess } from "@/application/governance/require-governance-access";

export default async function GovernanceLayout({ children }: { children: React.ReactNode }) {
  await requireGovernanceAccess("/governance");
  return <GovernanceProtectedSurface>{children}</GovernanceProtectedSurface>;
}

