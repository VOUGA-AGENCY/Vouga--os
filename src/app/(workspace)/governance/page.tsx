import Link from "next/link";
import { KeyRound, WalletCards } from "lucide-react";

export default function GovernancePage() {
  return (
    <main className="workspace-main module-main intent-page governance-page">
      <div className="module-heading">
        <div>
          <h1 className="display">Governance</h1>
          <p className="workspace-intro">Custos e acessos sensíveis.</p>
        </div>
      </div>
      <section aria-label="Áreas de Governance" className="intent-grid work-intent-grid">
        <Link className="intent-card work-square-card" href="/costs">
          <div className="work-card-icon">
            <WalletCards aria-hidden="true" />
          </div>
          <span className="work-card-content">
            <strong>Costs</strong>
            <small>Caixa, runway, subscrições e pagamentos.</small>
          </span>
        </Link>
        <Link className="intent-card work-square-card" href="/vault">
          <div className="work-card-icon">
            <KeyRound aria-hidden="true" />
          </div>
          <span className="work-card-content">
            <strong>Vault</strong>
            <small>Credenciais cifradas e acessos protegidos.</small>
          </span>
        </Link>
      </section>
      <footer className="work-tagline">
        <p className="work-tagline-text">Visibility creates responsibility.</p>
      </footer>
    </main>
  );
}

