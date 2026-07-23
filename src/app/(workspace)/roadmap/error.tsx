"use client";
import { SystemState } from "@/foundation/ui/system-state";
export default function RoadmapError({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="workspace-main module-main">
      <SystemState
        action={
          <button className="button-secondary" onClick={reset} type="button">
            Tentar novamente
          </button>
        }
        description="A direção não foi substituída por dados vazios. Tenta carregar novamente."
        eyebrow="Erro de leitura"
        title="Não foi possível carregar o Roadmap."
        tone="error"
      />
    </main>
  );
}
