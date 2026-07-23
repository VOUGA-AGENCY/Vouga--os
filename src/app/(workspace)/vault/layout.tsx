import { GovernanceProtectedSurface } from "@/foundation/security/governance-protected-surface";

export default function VaultLayout({ children }: { children: React.ReactNode }) {
  return <GovernanceProtectedSurface>{children}</GovernanceProtectedSurface>;
}
