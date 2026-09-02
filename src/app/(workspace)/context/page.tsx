import { getAuthenticatedUser } from "@/application/auth/current-user";
import {
  createContextEngine,
  createGlobalContextProjection,
} from "@/foundation/composition/context-engine";
import { redirect } from "next/navigation";
import { exportGlobalContextToMarkdown } from "@/projections/context-engine/export-markdown";
import { CopyContextButton } from "../copy-context-button";
import { ContextEngineView } from "./context-engine-view";

export default async function ContextPage() {
  const user = await getAuthenticatedUser();
  if (!user || user.role !== "admin") redirect("/");
  const [engine, globalContextProjection] = await Promise.all([
    createContextEngine(),
    createGlobalContextProjection(),
  ]);
  const nowIso = new Date().toISOString();
  const [graph, globalContext] = await Promise.all([
    engine.getFullGraph(nowIso, user.role),
    globalContextProjection.get(nowIso),
  ]);
  const markdown = exportGlobalContextToMarkdown(globalContext);

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

        <div className="context-hub-actions">
          <CopyContextButton label="Exportar contexto em Markdown" markdown={markdown} />
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
