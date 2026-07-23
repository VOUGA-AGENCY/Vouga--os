import Link from "next/link";
import { SystemState } from "@/foundation/ui/system-state";

export default function NotFound() {
  return (
    <main className="workspace-main module-main">
      <SystemState
        action={
          <Link className="button-secondary" href="/decisions">
            Voltar a Decisions
          </Link>
        }
        description="O identificador pode estar incorreto ou esta escolha já não estar disponível."
        eyebrow="Decision inexistente"
        title="Esta escolha não foi encontrada."
      />
    </main>
  );
}
