"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

export function CopyContextButton({
  markdown,
  label = "Exportar Markdown",
}: {
  markdown: string;
  label?: string;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(markdown);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      setCopied(false);
    }
  };

  return (
    <button
      type="button"
      className="button-secondary context-export-button"
      onClick={handleCopy}
      title="Copiar contexto operacional em formato Markdown factual"
    >
      {copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
      <span>{copied ? "Copiado!" : label}</span>
    </button>
  );
}
