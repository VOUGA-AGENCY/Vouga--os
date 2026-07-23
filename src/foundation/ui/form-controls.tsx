"use client";

import type { ReactNode } from "react";
import { useFormStatus } from "react-dom";

export function FormFields({ children }: { children: ReactNode }) {
  const { pending } = useFormStatus();

  return (
    <fieldset aria-busy={pending} className="form-fields" disabled={pending}>
      {children}
    </fieldset>
  );
}

export function FormSubmit({
  idleLabel,
  pendingLabel = "A guardar…",
}: {
  idleLabel: string;
  pendingLabel?: string;
}) {
  const { pending } = useFormStatus();

  return (
    <button aria-disabled={pending} className="button-primary" disabled={pending} type="submit">
      {pending ? pendingLabel : idleLabel}
    </button>
  );
}

export function FormFeedback({ message }: { message: string | null }) {
  if (!message) return null;

  return (
    <div aria-live="assertive" className="form-feedback form-feedback-error" role="alert">
      <strong>Não foi possível guardar.</strong>
      <span>{message}</span>
    </div>
  );
}

export function RequiredFieldsNote() {
  return (
    <p className="form-required-note">
      <span aria-hidden="true">*</span> Campo obrigatório
    </p>
  );
}
