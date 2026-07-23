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
      const { error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        setState({ message: getAuthenticationErrorMessage(error), pending: false });
        return;
      }

      router.push("/");
      router.refresh();
    } catch (error) {
      setState({ message: getAuthenticationErrorMessage(error), pending: false });
    }
  }

  return (
    <form className="login-form" onSubmit={handleSubmit}>
      <div className="field">
        <label htmlFor="email">Email</label>
        <input
          autoComplete="email"
          disabled={!configured}
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
          disabled={!configured}
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
        <SubmitButton disabled={!configured} pending={state.pending} />
      </div>
    </form>
  );
}
