import Link from "next/link";
import { SystemState } from "@/foundation/ui/system-state";
export default function RoadmapItemNotFound() {
  return (
    <main className="workspace-main module-main">
      <SystemState
        action={
          <Link className="button-secondary" href="/roadmap">
            Voltar ao Roadmap
          </Link>
        }
        description="O endereço pode estar incorreto ou esta intenção já não estar disponível."
        eyebrow="Roadmap Item inexistente"
        title="Esta intenção não foi encontrada."
      />
    </main>
  );
}
