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
        description="O trabalho não foi convertido num estado vazio. Tenta carregar novamente."
        eyebrow="Erro de leitura"
        title="Não foi possível carregar as Tasks."
        tone="error"
      />
    </main>
  );
}
