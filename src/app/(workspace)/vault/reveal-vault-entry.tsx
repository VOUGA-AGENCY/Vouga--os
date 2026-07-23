"use client";

import { useEffect, useState, useTransition } from "react";

import { revealVaultEntryAction, type VaultRevealState } from "./actions";

const REVEAL_TIMEOUT_MS = 30_000;

export function RevealVaultEntry({
  entryId,
  serviceName,
}: {
  entryId: string;
  serviceName: string;
}) {
  const [revealed, setRevealed] = useState<VaultRevealState | null>(null);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!revealed?.ok) return;
    const clear = () => {
      setRevealed(null);
      setCopyFeedback(null);
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

  function reveal() {
    startTransition(async () => {
      setCopyFeedback(null);
      setRevealed(await revealVaultEntryAction(entryId));
    });
  }

  async function copy(label: string, value: string) {
    await navigator.clipboard.writeText(value);
    setCopyFeedback(`${label} copiado.`);
    window.setTimeout(() => setCopyFeedback(null), 2000);
  }

  if (!revealed) {
    return (
      <button className="button-secondary" disabled={pending} onClick={reveal} type="button">
        {pending ? "A revelar…" : "Revelar"}
      </button>
    );
  }

  if (!revealed.ok) {
    return (
      <div className="vault-reveal-error" role="alert">
        <span>{revealed.message}</span>
        <button className="button-secondary" onClick={() => setRevealed(null)} type="button">
          Fechar
        </button>
      </div>
    );
  }

  return (
    <div aria-label={`Credencial revelada de ${serviceName}`} className="vault-reveal">
      <SecretLine
        label="Username"
        onCopy={() => copy("Username", revealed.secret.username)}
        value={revealed.secret.username}
      />
      <SecretLine
        label="Password"
        onCopy={() => copy("Password", revealed.secret.password)}
        value={revealed.secret.password}
      />
      {revealed.secret.note ? (
        <SecretLine
          label="Nota"
          onCopy={() => copy("Nota", revealed.secret.note ?? "")}
          value={revealed.secret.note}
        />
      ) : null}
      <div className="vault-reveal-footer">
        <span aria-live="polite">{copyFeedback ?? "Oculta automaticamente em 30 segundos."}</span>
        <button className="button-secondary" onClick={() => setRevealed(null)} type="button">
          Ocultar
        </button>
      </div>
    </div>
  );
}

function SecretLine({
  label,
  onCopy,
  value,
}: {
  label: string;
  onCopy: () => void;
  value: string;
}) {
  return (
    <div className="vault-secret-line">
      <span>{label}</span>
      <code>{value}</code>
      <button className="button-secondary" onClick={onCopy} type="button">
        Copiar
      </button>
    </div>
  );
}
