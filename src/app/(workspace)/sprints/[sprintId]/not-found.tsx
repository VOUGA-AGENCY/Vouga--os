import Link from "next/link";
import { SystemState } from "@/foundation/ui/system-state";
export default function NotFound() {
  return (
    <main className="workspace-main module-main">
      <SystemState
        action={
          <Link className="button-secondary" href="/sprints">
            Voltar às Sprints
          </Link>
        }
        description="O endereço pode estar incorreto ou este ciclo já não estar disponível."
        eyebrow="Sprint inexistente"
        title="Este ciclo não foi encontrado."
      />
    </main>
  );
}
