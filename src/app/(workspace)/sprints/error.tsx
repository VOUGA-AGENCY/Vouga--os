"use client";
import { SystemState } from "@/foundation/ui/system-state";
export default function Error({ reset }: { reset: () => void }) {
  return (
    <main className="workspace-main module-main">
      <SystemState
        action={
          <button className="button-secondary" onClick={reset} type="button">
            Tentar novamente
          </button>
        }
        description="Os ciclos não foram substituídos por vazio. Tenta carregar novamente."
        eyebrow="Erro de leitura"
        title="Não foi possível carregar as Sprints."
        tone="error"
      />
    </main>
  );
}
