"use client";

import { SystemState } from "@/foundation/ui/system-state";

export default function CalendarError({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="workspace-main module-main">
      <SystemState
        action={<button className="button-secondary" onClick={reset} type="button">Tentar novamente</button>}
        description="Nenhuma ausência de compromissos está a ser afirmada enquanto a leitura estiver indisponível."
        eyebrow="Calendar indisponível"
        title="Não foi possível construir a leitura temporal."
        tone="error"
      />
    </main>
  );
}
