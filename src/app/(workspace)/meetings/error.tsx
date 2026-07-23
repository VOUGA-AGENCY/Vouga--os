"use client";

import { SystemState } from "@/foundation/ui/system-state";

export default function MeetingsError({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="workspace-main module-main">
      <SystemState
        action={
          <button className="button-secondary" onClick={reset} type="button">
            Tentar novamente
          </button>
        }
        description="As interações não foram substituídas por uma lista vazia. Tenta carregar novamente."
        eyebrow="Erro de leitura"
        title="Não foi possível carregar as Meetings."
        tone="error"
      />
    </main>
  );
}
