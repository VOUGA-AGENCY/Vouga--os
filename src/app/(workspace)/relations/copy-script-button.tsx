"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

export function CopyScriptButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      className="crm-copy-button"
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1600);
      }}
      type="button"
    >
      {copied ? <Check /> : <Copy />}
      {copied ? "Copiado" : "Copiar"}
    </button>
  );
}
