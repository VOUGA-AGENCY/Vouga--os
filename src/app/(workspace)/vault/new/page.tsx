import Link from "next/link";

import { requireGovernanceAccess } from "@/application/governance/require-governance-access";
import { getVaultSecurityEnv } from "@/foundation/config/vault-env";

import { VaultEntryForm } from "../vault-entry-form";

export default async function NewVaultEntryPage() {
  await requireGovernanceAccess("/vault/new");
  if (!getVaultSecurityEnv()) {
    return (
      <main className="workspace-main module-main object-view">
        <Link className="back-link" href="/vault">
          ← Vault
        </Link>
        <h1 className="display">Vault não configurado</h1>
        <p>Configura a chave de cifragem no servidor antes de adicionar credenciais.</p>
      </main>
    );
  }
  return (
    <main className="workspace-main module-main object-view">
      <Link className="back-link" href="/vault">
        ← Vault
      </Link>
      <div className="module-heading">
        <h1 className="display">New credential</h1>
      </div>
      <VaultEntryForm />
    </main>
  );
}
