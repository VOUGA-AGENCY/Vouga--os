"use client";

import { SystemState } from "@/foundation/ui/system-state";

export default function WorkspaceError({ reset }: { reset: () => void }) {
  return (
    <main className="workspace-main">
      <SystemState
        action={
          <button className="button-primary" onClick={reset} type="button">
            Tentar novamente
          </button>
        }
        description="A autenticação, a configuração base ou uma fonte necessária ficou indisponível."
        eyebrow="Workspace indisponível"
        title="Não foi possível abrir esta área do Vouga OS."
        tone="error"
      />
    </main>
  );
}
