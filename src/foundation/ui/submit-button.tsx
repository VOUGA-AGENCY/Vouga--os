"use client";

import { ArrowRight } from "lucide-react";

export function SubmitButton({
  disabled = false,
  pending = false,
}: {
  disabled?: boolean;
  pending?: boolean;
}) {
  return (
    <button className="button-primary" disabled={disabled || pending} type="submit">
      {pending ? "A entrar…" : "Entrar"}
      {!pending && <ArrowRight aria-hidden="true" />}
    </button>
  );
}
