"use client";

import { useRef, useState, useTransition } from "react";
import { createUserAction } from "./actions";

export function CreateUserForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSuccess(false);

    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      const res = await createUserAction(formData);
      if (res?.error) {
        setError(res.error);
      } else {
        setSuccess(true);
        formRef.current?.reset();
      }
    });
  };

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="create-user-form" style={{ marginTop: "1.5rem" }}>
      <h3 style={{ fontSize: "1.1rem", marginBottom: "1rem" }}>Adicionar Utilizador</h3>

      <div className="field" style={{ marginBottom: "1rem" }}>
        <label htmlFor="new-email">Email</label>
        <input
          id="new-email"
          name="email"
          type="email"
          required
          placeholder="nome@vouga-agency.pt"
          disabled={isPending}
          style={{ width: "100%", padding: "0.5rem", borderRadius: "4px", border: "1px solid var(--color-border)" }}
        />
      </div>

      <div className="field" style={{ marginBottom: "1rem" }}>
        <label htmlFor="new-password">Palavra-passe</label>
        <input
          id="new-password"
          name="password"
          type="password"
          required
          placeholder="••••••••"
          disabled={isPending}
          style={{ width: "100%", padding: "0.5rem", borderRadius: "4px", border: "1px solid var(--color-border)" }}
        />
      </div>

      <div className="field" style={{ marginBottom: "1rem" }}>
        <label htmlFor="new-role">Função</label>
        <select
          id="new-role"
          name="role"
          defaultValue="engineer"
          disabled={isPending}
          style={{
            width: "100%",
            padding: "0.5rem",
            borderRadius: "4px",
            border: "1px solid var(--color-border)",
            background: "var(--color-bg)",
            color: "var(--color-text-primary)",
          }}
        >
          <option value="engineer">Engineer</option>
          <option value="admin">Admin</option>
        </select>
      </div>

      {error && <p className="form-error" style={{ color: "var(--color-status-error)", fontSize: "0.875rem", margin: "0.5rem 0" }}>{error}</p>}
      {success && <p style={{ color: "green", fontSize: "0.875rem", margin: "0.5rem 0" }}>Utilizador criado com sucesso!</p>}

      <button className="button-primary" type="submit" disabled={isPending} style={{ marginTop: "0.5rem" }}>
        {isPending ? "A criar..." : "Criar utilizador"}
      </button>
    </form>
  );
}
