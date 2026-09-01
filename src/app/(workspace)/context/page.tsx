import { getAuthenticatedUser } from "@/application/auth/current-user";
import { createContextEngine } from "@/foundation/composition/context-engine";
import { redirect } from "next/navigation";
import { ContextEngineView } from "./context-engine-view";

export default async function ContextPage() {
  const user = await getAuthenticatedUser();
  if (!user || user.role !== "admin") redirect("/");
  const engine = await createContextEngine();
  const nowIso = new Date().toISOString();
  const graph = await engine.getFullGraph(nowIso, user.role);

  return (
    <main className="workspace-main module-main context-hub-main">
      <header className="context-hub-header">
        <div>
          <span className="eyebrow">Intellectual Network</span>
          <h1 className="display">Context Engine</h1>
          <p className="workspace-intro">
            Rede de inteligência operacional e rastreio de dados do Vouga OS.
          </p>
        </div>

        <div className="context-hub-stats" aria-label="Estatísticas da Rede">
          <div className="context-stat-pill">
            <span>Entidades</span>
            <strong>{graph.stats.totalEntities}</strong>
          </div>
          <div className="context-stat-pill">
            <span>Relações</span>
            <strong>{graph.stats.totalConnections}</strong>
          </div>
          <div className="context-stat-pill">
            <span>Densidade</span>
            <strong>{graph.stats.densityScore}</strong>
          </div>
          <div className="context-stat-pill">
            <span>Camadas</span>
            <strong>{graph.stats.activeClusters}</strong>
          </div>
        </div>
      </header>

      <ContextEngineView graph={graph} />
    </main>
  );
}
