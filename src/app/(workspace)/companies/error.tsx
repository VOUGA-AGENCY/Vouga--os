"use client";

import { SystemState } from "@/foundation/ui/system-state";

export default function CompaniesError({ reset }: { reset: () => void }) {
  return (
    <main className="workspace-main module-main">
      <SystemState
        action={
          <button className="button-secondary" onClick={reset} type="button">
            Tentar novamente
          </button>
        }
        description="A informação permanece intacta. Tenta novamente antes de atualizar qualquer relação."
        eyebrow="Erro de leitura"
        title="Não foi possível carregar as Organisations."
        tone="error"
      />
    </main>
  );
}
