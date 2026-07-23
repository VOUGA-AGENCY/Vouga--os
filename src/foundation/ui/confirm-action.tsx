"use client";

import type { ReactNode } from "react";
import { useFormStatus } from "react-dom";

function ConfirmationButton({
  children,
  className,
  pendingLabel,
}: {
  children: ReactNode;
  className: string;
  pendingLabel: string;
}) {
  const { pending } = useFormStatus();

  return (
    <button aria-disabled={pending} className={className} disabled={pending} type="submit">
      {pending ? pendingLabel : children}
    </button>
  );
}

export function ConfirmAction({
  action,
  children,
  className = "button-danger",
  confirmation,
  pendingLabel = "A atualizar…",
}: {
  action: (formData: FormData) => void | Promise<void>;
  children: ReactNode;
  className?: string;
  confirmation: string;
  pendingLabel?: string;
}) {
  return (
    <form
      action={action}
      onSubmit={(event) => {
        if (!window.confirm(confirmation)) event.preventDefault();
      }}
    >
      <ConfirmationButton className={className} pendingLabel={pendingLabel}>
        {children}
      </ConfirmationButton>
    </form>
  );
}
