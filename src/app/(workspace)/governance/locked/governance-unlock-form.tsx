"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function GovernanceUnlockForm({
  configurationAvailable,
  returnTo,
}: {
  configurationAvailable: boolean;
  returnTo: string;
}) {
  const router = useRouter();
  const [accessKey, setAccessKey] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function unlock(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const response = await fetch("/api/governance/unlock", {
        body: JSON.stringify({ accessKey }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      if (response.ok) {
        setAccessKey("");
        router.replace(returnTo);
        router.refresh();
        return;
      }
      setError(
        response.status === 429
          ? "Demasiadas tentativas. Espera um minuto antes de tentar novamente."
          : response.status === 503
            ? "A proteção ainda não está configurada neste ambiente."
            : "A access key não é válida.",
      );
    } catch {
      setError("Não foi possível confirmar o acesso. Tenta novamente.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="governance-unlock-form" onSubmit={unlock}>
      <label className="sr-only" htmlFor="governance-access-key">Access key</label>
      <input
        autoComplete="off"
        autoFocus
        disabled={!configurationAvailable || submitting}
        id="governance-access-key"
        maxLength={256}
        name="accessKey"
        onChange={(event) => setAccessKey(event.target.value)}
        placeholder="Access key"
        required
        type="password"
        value={accessKey}
      />
      {error ? <p className="form-error" role="alert">{error}</p> : null}
      {!configurationAvailable ? (
        <p className="form-error" role="status">
          Falta configurar o hash da access key e o segredo de sessão no servidor.
        </p>
      ) : null}
      <button className="button-primary" disabled={!configurationAvailable || submitting} type="submit">
        {submitting ? "A confirmar..." : "Entrar"}
      </button>
    </form>
  );
}
