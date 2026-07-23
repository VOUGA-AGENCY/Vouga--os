import Link from "next/link";

import {
  ROADMAP_HORIZON_LABELS,
  ROADMAP_KIND_LABELS,
  ROADMAP_LIFECYCLE_STATUS_LABELS,
  type RoadmapHorizon,
} from "@/domain/roadmap/roadmap-item";
import { createRoadmapModule } from "@/foundation/composition/roadmap";
import type { RoadmapItemSummary } from "@/projections/roadmap/roadmap-read-model";

export default async function RoadmapPage() {
  const { readModel } = await createRoadmapModule();
  const [roadmap, history] = await Promise.all([readModel.getGlobal(), readModel.listHistory()]);
  const active = roadmap.now.length + roadmap.next.length + roadmap.later.length;
  return (
    <main className="workspace-main module-main">
      <div className="module-heading">
        <div>
          <h1 className="display">Roadmap</h1>
          <p className="workspace-intro">Now, Next, Later.</p>
        </div>
        <Link className="button-primary" href="/roadmap/new">
          New item
        </Link>
      </div>
      {active === 0 ? (
        <section className="empty-state">
          <p className="eyebrow">Empty</p>
          <h2 className="display">No roadmap items yet.</h2>
          <p>Começa com uma direção clara.</p>
          <Link className="button-secondary" href="/roadmap/new">
            New item
          </Link>
        </section>
      ) : (
        <div className="roadmap-collection">
          {(["now", "next", "later"] as RoadmapHorizon[]).map((horizon) => (
            <Horizon horizon={horizon} items={roadmap[horizon]} key={horizon} />
          ))}
        </div>
      )}
      {history.length > 0 ? (
        <section className="collection-section collection-section-secondary">
          <div className="collection-heading">
            <div>
              <p className="eyebrow">{history.length} no histórico</p>
              <h2 className="section-title">Concluídos e abandonados</h2>
            </div>
            <p>Intenções preservadas fora da direção ativa.</p>
          </div>
          <div className="collection-list">
            {history.map((item) => (
              <Item key={item.id} item={item} />
            ))}
          </div>
        </section>
      ) : null}
    </main>
  );
}

function Horizon({
  horizon,
  items,
}: {
  horizon: RoadmapHorizon;
  items: readonly RoadmapItemSummary[];
}) {
  return (
    <section className={`roadmap-horizon roadmap-horizon-${horizon}`}>
      <div className="roadmap-horizon-heading">
        <p className="eyebrow">
          {items.length} {items.length === 1 ? "item" : "itens"}
        </p>
        <h2>{ROADMAP_HORIZON_LABELS[horizon]}</h2>
      </div>
      {items.length === 0 ? (
        <p className="roadmap-horizon-empty">Sem intenção ativa neste horizonte.</p>
      ) : (
        <div className="roadmap-items">
          {items.map((item) => (
            <Item key={item.id} item={item} />
          ))}
        </div>
      )}
    </section>
  );
}

function Item({ item }: { item: RoadmapItemSummary }) {
  return (
    <Link className="collection-row collection-row-roadmap" href={`/roadmap/${item.id}`}>
      <div className="collection-primary">
        <span className={`status-pill status-pill-${item.lifecycleStatus}`}>
          {item.lifecycleStatus === "active"
            ? ROADMAP_KIND_LABELS[item.kind]
            : ROADMAP_LIFECYCLE_STATUS_LABELS[item.lifecycleStatus]}
        </span>
        <h2>{item.title}</h2>
        <p>{item.description}</p>
        <p className="roadmap-evidence">
          <b>Evidência</b>
          {item.evidence}
        </p>
      </div>
      <div className="collection-meta">
        <span>
          <b>Owner</b>
          {item.ownerDisplayName ?? "Sem owner"}
        </span>
        <span>
          <b>Execução</b>
          {item.taskCount} Tasks · {item.sprintCount} Sprints
        </span>
        <span>
          <b>Contexto</b>
          {item.decisionCount} Decisions · {item.companyCount} Organisations
        </span>
      </div>
    </Link>
  );
}
