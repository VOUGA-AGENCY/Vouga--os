import { unstable_noStore as noStore } from "next/cache";
import Link from "next/link";
import { KeyRound, Plus } from "lucide-react";

import { getAuthenticatedUser } from "@/application/auth/current-user";
import { requireGovernanceAccess } from "@/application/governance/require-governance-access";
import { getVaultApplicationErrorMessage } from "@/application/vault/vault-service";
import { createVaultModule } from "@/foundation/composition/vault";
import { getVaultSecurityEnv } from "@/foundation/config/vault-env";
import { ConfirmAction } from "@/foundation/ui/confirm-action";

import { deleteVaultEntryAction } from "./actions";
import { RevealVaultEntry } from "./reveal-vault-entry";

export const dynamic = "force-dynamic";

export default async function VaultPage() {
  noStore();
  await requireGovernanceAccess("/vault");

  const [user, vaultModule] = await Promise.all([
    getAuthenticatedUser(),
    createVaultModule(),
  ]);

  const env = getVaultSecurityEnv();
  if (!env) return <VaultSetupState kind="key" />;

  let entries;
  try {
    entries = await vaultModule.service.listEntries();
  } catch (error) {
    return <VaultSetupState kind="migration" message={getVaultApplicationErrorMessage(error)} />;
  }

  return (
    <main className="workspace-main module-main">
      <div className="module-heading">
        <div>
          <h1 className="display">Vault</h1>
        </div>
        <Link className="button-primary" href="/vault/new">
          <Plus aria-hidden="true" />
          New credential
        </Link>
      </div>

      {entries.length ? (
        <div aria-label="Credenciais" className="vault-list">
          {entries.map((entry) => (
            <article className="vault-row" key={entry.id}>
              <div className="vault-row-main">
                <KeyRound aria-hidden="true" />
                <div>
                  <h2>{entry.serviceName}</h2>
                  {entry.url ? (
                    <a href={entry.url} rel="noreferrer" target="_blank">
                      {new URL(entry.url).hostname}
                    </a>
                  ) : (
                    <span>Sem URL</span>
                  )}
                </div>
              </div>
              <span className="vault-updated">Atualizado {formatDate(entry.updatedAt)}</span>
              <div className="vault-actions">
                <RevealVaultEntry
                  entryId={entry.id}
                  serviceName={entry.serviceName}
                  userEmail={user?.email ?? null}
                />
                <ConfirmAction
                  action={deleteVaultEntryAction.bind(null, entry.id)}
                  confirmation={`Eliminar definitivamente a credencial de ${entry.serviceName}?`}
                  pendingLabel="A eliminar…"
                >
                  Eliminar
                </ConfirmAction>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <section className="empty-state vault-empty">
          <KeyRound aria-hidden="true" />
          <h2 className="section-title">Sem credenciais.</h2>
          <p>Adiciona apenas contas que precisam de ser partilhadas entre os founders.</p>
        </section>
      )}
    </main>
  );
}

function VaultSetupState({ kind, message }: { kind: "key" | "migration"; message?: string }) {
  return (
    <main className="workspace-main module-main">
      <div className="module-heading">
        <h1 className="display">Vault</h1>
      </div>
      <section className="vault-setup-state">
        <KeyRound aria-hidden="true" />
        <h2>{kind === "key" ? "Falta a chave de cifragem." : "Falta ativar a persistência."}</h2>
        <p>
          {kind === "key"
            ? "Configura VAULT_ENCRYPTION_KEY e VAULT_KEY_VERSION no servidor."
            : (message ?? "Aplica a migration local do Vault no Supabase.")}
        </p>
        <p className="muted-copy">
          Nenhuma credencial será aceite enquanto as duas proteções não estiverem prontas.
        </p>
      </section>
    </main>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-PT", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/Lisbon",
  }).format(new Date(value));
}
