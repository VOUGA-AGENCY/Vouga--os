import Link from "next/link";
import { WalletCards } from "lucide-react";
import { requireGovernanceAccess } from "@/application/governance/require-governance-access";
import { getAuthenticatedUser } from "@/application/auth/current-user";
import { createClient } from "@/persistence/supabase/server";
import { MemberRowControls } from "./member-row-controls";
import { CreateUserForm } from "./create-user-form";

export default async function GovernancePage() {
  await requireGovernanceAccess("/governance");
  const user = await getAuthenticatedUser();
  const currentUserId = user?.id || "";

  const supabase = await createClient();
  const { data: members, error } = await supabase
    .from("members")
    .select("id, display_name, email, role, is_active")
    .order("display_name");

  return (
    <main className="workspace-main module-main intent-page governance-page">
      <div className="module-heading">
        <div>
          <h1 className="display">Governance</h1>
          <p className="workspace-intro">Custos e controlos administrativos.</p>
        </div>
      </div>

      <section aria-label="Áreas de Governance" className="intent-grid work-intent-grid" style={{ marginBottom: "2rem" }}>
        <Link className="intent-card work-square-card" href="/costs">
          <div className="work-card-icon">
            <WalletCards aria-hidden="true" />
          </div>
          <span className="work-card-content">
            <strong>Costs</strong>
            <small>Caixa, runway, subscrições e pagamentos.</small>
          </span>
        </Link>
      </section>

      <div className="settings-sections" style={{ marginTop: "2rem" }}>
        <section className="settings-section">
          <header>
            <div className="settings-section-title">
              <h2>Utilizadores</h2>
            </div>
            <p>Gere os acessos e permissões da equipa.</p>
          </header>
          <div className="settings-section-content">
            {error ? (
              <p className="form-error">Não foi possível carregar os utilizadores.</p>
            ) : (
              <div className="members-list" style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                {members?.map((member) => (
                  <div
                    key={member.id}
                    className="member-item-row"
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                      padding: "1rem",
                      border: "1px solid var(--color-border)",
                      borderRadius: "6px",
                      background: "var(--color-bg-surface)",
                      gap: "1rem"
                    }}
                  >
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                      <strong style={{ fontSize: "1.05rem", fontWeight: 500 }}>{member.display_name}</strong>
                      <span style={{ fontSize: "0.875rem", color: "var(--color-text-secondary)" }}>
                        {member.email}
                      </span>
                    </div>
                    <MemberRowControls
                      memberId={member.id}
                      currentRole={member.role as "admin" | "engineer"}
                      currentIsActive={member.is_active}
                      currentUserId={currentUserId}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        <section className="settings-section">
          <header>
            <div className="settings-section-title">
              <h2>Novo Utilizador</h2>
            </div>
            <p>Adiciona um colaborador ao Vouga OS.</p>
          </header>
          <div className="settings-section-content">
            <CreateUserForm />
          </div>
        </section>
      </div>

      <footer className="work-tagline" style={{ marginTop: "4rem" }}>
        <p className="work-tagline-text">Visibility creates responsibility.</p>
      </footer>
    </main>
  );
}
