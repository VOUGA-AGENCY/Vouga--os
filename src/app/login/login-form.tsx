"use client";

import { type FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

import { getAuthenticationErrorMessage } from "@/application/auth/messages";
import { SubmitButton } from "@/foundation/ui/submit-button";
import { createClient } from "@/persistence/supabase/browser";

type LoginState = {
  message: string | null;
  pending: boolean;
};

export function LoginForm({ configured }: { configured: boolean }) {
  const router = useRouter();
  const [state, setState] = useState<LoginState>({ message: null, pending: false });
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [modalError, setModalError] = useState<string | null>(null);
  const [modalPending, setModalPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");

    if (!email || !password) {
      setState({ message: "Preenche o email e a palavra-passe.", pending: false });
      return;
    }

    setState({ message: null, pending: true });

    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        setState({ message: getAuthenticationErrorMessage(error), pending: false });
        return;
      }

      const user = data.user;
      console.log("DEBUG: user", user);
      console.log("DEBUG: must_change_password", user?.user_metadata?.must_change_password);
      console.log("DEBUG: last_sign_in_at", user?.last_sign_in_at);
      const isFirstLogin = !user?.last_sign_in_at || user?.user_metadata?.must_change_password === true;

      if (isFirstLogin) {
        setShowPasswordChange(true);
        setState({ message: null, pending: false });
      } else {
        router.push("/");
        router.refresh();
      }
    } catch (error) {
      setState({ message: getAuthenticationErrorMessage(error), pending: false });
    }
  }

  async function handlePasswordChangeSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setModalError(null);

    if (newPassword.length < 6) {
      setModalError("A palavra-passe deve ter pelo menos 6 caracteres.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setModalError("As palavras-passe não coincidem.");
      return;
    }

    setModalPending(true);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
        data: { must_change_password: false },
      });

      if (error) {
        setModalError(error.message);
        setModalPending(false);
        return;
      }

      router.push("/");
      router.refresh();
    } catch (err: unknown) {
      setModalError(err instanceof Error ? err.message : "Erro ao atualizar a palavra-passe.");
      setModalPending(false);
    }
  }

  return (
    <>
      <form className="login-form" onSubmit={handleSubmit}>
        <div className="field">
          <label htmlFor="email">Email</label>
          <input
            autoComplete="email"
            disabled={!configured || showPasswordChange}
            id="email"
            name="email"
            placeholder="nome@vouga-agency.pt"
            required
            type="email"
          />
        </div>
        <div className="field">
          <label htmlFor="password">Palavra-passe</label>
          <input
            autoComplete="current-password"
            disabled={!configured || showPasswordChange}
            id="password"
            name="password"
            placeholder="••••••••••"
            required
            type="password"
          />
        </div>
        {state.message && (
          <p aria-live="polite" className="form-error" role="alert">
            {state.message}
          </p>
        )}
        <div className="login-actions">
          <SubmitButton disabled={!configured || showPasswordChange} pending={state.pending} />
        </div>
      </form>

      {showPasswordChange && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            display: "grid",
            placeItems: "center",
            background: "rgba(0, 0, 0, 0.75)",
            backdropFilter: "blur(4px)",
            padding: "1rem",
          }}
        >
          <div
            style={{
              background: "var(--color-bg)",
              border: "1px solid var(--color-border)",
              borderRadius: "6px",
              padding: "2rem",
              width: "100%",
              maxWidth: "420px",
              boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
              display: "flex",
              flexDirection: "column",
              gap: "1.5rem",
            }}
          >
            <div>
              <h2 className="display" style={{ fontSize: "1.25rem", fontWeight: 500, marginBottom: "0.5rem" }}>
                Alterar Palavra-passe
              </h2>
              <p style={{ fontSize: "0.875rem", color: "var(--color-text-secondary)", lineHeight: 1.4 }}>
                Este é o teu primeiro início de sessão. Por favor define uma nova palavra-passe segura para a tua conta.
              </p>
            </div>

            <form onSubmit={handlePasswordChangeSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div className="field">
                <label htmlFor="new-password">Nova Palavra-passe</label>
                <input
                  id="new-password"
                  type="password"
                  required
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  disabled={modalPending}
                  style={{
                    width: "100%",
                    padding: "0.5rem",
                    borderRadius: "4px",
                    border: "1px solid var(--color-border)",
                    background: "var(--color-bg)",
                    color: "var(--color-text-primary)",
                  }}
                />
              </div>

              <div className="field">
                <label htmlFor="confirm-password">Confirmar Nova Palavra-passe</label>
                <input
                  id="confirm-password"
                  type="password"
                  required
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={modalPending}
                  style={{
                    width: "100%",
                    padding: "0.5rem",
                    borderRadius: "4px",
                    border: "1px solid var(--color-border)",
                    background: "var(--color-bg)",
                    color: "var(--color-text-primary)",
                  }}
                />
              </div>

              {modalError && (
                <p className="form-error" style={{ color: "var(--color-status-error)", fontSize: "0.875rem" }}>
                  {modalError}
                </p>
              )}

              <button
                className="button-primary"
                type="submit"
                disabled={modalPending}
                style={{
                  width: "100%",
                  height: "2.375rem",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 500,
                  marginTop: "0.5rem",
                }}
              >
                {modalPending ? "A guardar..." : "Guardar e Entrar"}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
