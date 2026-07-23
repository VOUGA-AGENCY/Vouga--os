import Link from "next/link";
import { SystemState } from "@/foundation/ui/system-state";

export default function CompanyNotFound() {
  return (
    <main className="workspace-main module-main">
      <SystemState
        action={
          <Link className="button-secondary" href="/companies">
            Voltar a Organisations
          </Link>
        }
        description="Pode ter sido removida fora da aplicação ou o endereço pode estar incorreto."
        eyebrow="Organisation inexistente"
        title="Esta relação não foi encontrada."
      />
    </main>
  );
}
