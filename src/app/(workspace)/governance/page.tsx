import Link from "next/link";
import { KeyRound, WalletCards } from "lucide-react";

export default function GovernancePage() {
  return (
    <main className="workspace-main module-main intent-page">
      <div className="module-heading">
        <div>
          <h1 className="display">Governance</h1>
          <p className="workspace-intro">Custos e acessos sensíveis.</p>
        </div>
      </div>
      <section aria-label="Áreas de Governance" className="intent-grid">
        <Link className="intent-card" href="/costs">
          <WalletCards aria-hidden="true" />
          <span><strong>Costs</strong><small>Caixa, runway, subscrições e pagamentos.</small></span>
        </Link>
        <Link className="intent-card" href="/vault">
          <KeyRound aria-hidden="true" />
          <span><strong>Vault</strong><small>Credenciais cifradas e reveladas apenas por ação explícita.</small></span>
        </Link>
      </section>
    </main>
  );
}
