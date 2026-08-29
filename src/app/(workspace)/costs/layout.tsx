import "server-only";

import { GovernanceProtectedSurface } from "@/foundation/security/governance-protected-surface";
import { requireGovernanceAccess } from "@/application/governance/require-governance-access";

export default async function CostsLayout({ children }: { children: React.ReactNode }) {
  await requireGovernanceAccess("/costs");
  return <GovernanceProtectedSurface>{children}</GovernanceProtectedSurface>;
}

