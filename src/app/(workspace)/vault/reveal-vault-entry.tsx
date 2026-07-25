"use client";

import { useEffect, useState, useTransition } from "react";
import { Eye, EyeOff, Lock, X } from "lucide-react";

import { revealVaultEntryAction, type VaultRevealState } from "./actions";

const REVEAL_TIMEOUT_MS = 30_000;

export function RevealVaultEntry({
  entryId,
  serviceName,
  userEmail,
}: {
  entryId: string;
  serviceName: string;
  userEmail: string | null;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [accountPassword, setAccountPassword] = useState("");
  const [revealed, setRevealed] = useState<VaultRevealState | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!revealed?.ok) return;
    const clear = () => {
      setRevealed(null);
      setCopyFeedback(null);
      setIsOpen(false);
      setAccountPassword("");
    };
    const timeout = window.setTimeout(clear, REVEAL_TIMEOUT_MS);
    const visibility = () => {
      if (document.visibilityState === "hidden") clear();
    };
    document.addEventListener("visibilitychange", visibility);
    return () => {
      window.clearTimeout(timeout);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, [revealed]);

  function handleOpenModal() {
    setErrorMsg(null);
    setAccountPassword("");
    setIsOpen(true);
  }

  function handleCloseModal() {
    setIsOpen(false);
    setErrorMsg(null);
    setAccountPassword("");
  }

  function handleSubmitPassword(e: React.FormEvent) {
    e.preventDefault();
    if (!accountPassword.trim()) {
      setErrorMsg("Introduz a tua palavra-passe da conta.");
      return;
    }

    startTransition(async () => {
      setErrorMsg(null);
      const result = await revealVaultEntryAction(entryId, accountPassword);
      if (result.ok) {
        setRevealed(result);
        setIsOpen(false);
      } else {
        setErrorMsg(result.message);
      }
    });
  }

  async function copy(label: string, value: string) {
    await navigator.clipboard.writeText(value);
    setCopyFeedback(`${label} copiado.`);
    window.setTimeout(() => setCopyFeedback(null), 2000);
  }

  return (
    <div className="vault-reveal-wrapper">
      {revealed?.ok ? (
        <div className="vault-revealed-panel">
          <div className="vault-secret-inline">
            <span>Password: <code>{revealed.secret.password}</code></span>
            <button
              className="button-tertiary"
              onClick={() => copy("Password", revealed.secret.password)}
              type="button"
            >
              Copiar
            </button>
            <button
              aria-label="Ocultar password"
              className="button-tertiary icon-only"
              onClick={() => setRevealed(null)}
              type="button"
            >
              <EyeOff size={16} />
            </button>
          </div>
          {copyFeedback && <small className="vault-copy-toast">{copyFeedback}</small>}
        </div>
      ) : (
        <div className="vault-masked-panel">
          <span className="vault-masked-dots">••••••••</span>
          <button
            aria-label={`Revelar palavra-passe de ${serviceName}`}
            className="vault-eye-button"
            onClick={handleOpenModal}
            title="Revelar palavra-passe"
            type="button"
          >
            <Eye size={16} />
          </button>
        </div>
      )}

      {/* Account Password Verification Modal */}
      {isOpen && (
        <div className="vault-modal-overlay" onClick={handleCloseModal}>
          <div className="vault-modal-card" onClick={(e) => e.stopPropagation()}>
            <header className="vault-modal-header">
              <div className="vault-modal-title">
                <Lock size={18} />
                <h3>Verificação de Segurança</h3>
              </div>
              <button className="vault-modal-close" onClick={handleCloseModal} type="button">
                <X size={18} />
              </button>
            </header>

            <form onSubmit={handleSubmitPassword}>
              <div className="vault-modal-body">
                <p>
                  Confirma a palavra-passe da tua conta <strong>({userEmail ?? "Sessão Vouga"})</strong> para ver a palavra-passe de <strong>{serviceName}</strong>.
                </p>

                <div className="form-field">
                  <label htmlFor="account-password-input">Palavra-passe da conta</label>
                  <input
                    autoFocus
                    id="account-password-input"
                    onChange={(e) => setAccountPassword(e.target.value)}
                    placeholder="A tua palavra-passe do Vouga OS"
                    type="password"
                    value={accountPassword}
                  />
                </div>

                {errorMsg && <div className="form-error" role="alert">{errorMsg}</div>}
              </div>

              <footer className="vault-modal-footer">
                <button className="button-secondary" onClick={handleCloseModal} type="button">
                  Cancelar
                </button>
                <button className="button-primary" disabled={pending} type="submit">
                  {pending ? "A verificar…" : "Confirmar"}
                </button>
              </footer>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
