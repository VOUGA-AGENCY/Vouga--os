import Link from "next/link";
import { SystemState } from "@/foundation/ui/system-state";
export default function NotFound() {
  return (
    <main className="workspace-main module-main">
      <SystemState
        action={
          <Link className="button-secondary" href="/tasks">
            Voltar a Tasks
          </Link>
        }
        description="O identificador pode estar incorreto ou este compromisso já não estar disponível."
        eyebrow="Task inexistente"
        title="Este compromisso não foi encontrado."
      />
    </main>
  );
}
