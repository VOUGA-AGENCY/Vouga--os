import Link from "next/link";
import { SystemState } from "@/foundation/ui/system-state";

export default function MeetingNotFound() {
  return (
    <main className="workspace-main module-main">
      <SystemState
        action={
          <Link className="button-secondary" href="/meetings">
            Voltar às Meetings
          </Link>
        }
        description="O endereço pode estar incorreto ou esta interação já não estar disponível."
        eyebrow="Meeting inexistente"
        title="Esta interação não foi encontrada."
      />
    </main>
  );
}
