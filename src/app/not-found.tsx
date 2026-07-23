import Link from "next/link";
import { SystemState } from "@/foundation/ui/system-state";

export default function NotFound() {
  return (
    <main className="workspace-main">
      <SystemState
        action={
          <Link className="button-secondary" href="/">
            Voltar ao Calendar
          </Link>
        }
        description="O endereço pode estar incorreto ou esta superfície ainda não fazer parte do Vouga OS."
        eyebrow="404"
        title="Esta superfície não foi encontrada."
      />
    </main>
  );
}
