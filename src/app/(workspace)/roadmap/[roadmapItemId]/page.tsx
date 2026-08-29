import Link from "next/link";
import { notFound } from "next/navigation";

import { getAuthenticatedUser } from "@/application/auth/current-user";
import {
  ROADMAP_HORIZON_LABELS,
  ROADMAP_KIND_LABELS,
  ROADMAP_LIFECYCLE_STATUS_LABELS,
} from "@/domain/roadmap/roadmap-item";
import { createContextEngine } from "@/foundation/composition/context-engine";
import { createRoadmapModule } from "@/foundation/composition/roadmap";
import { ConfirmAction } from "@/foundation/ui/confirm-action";
import { ContextPanel } from "../../context-panel";

import { abandonRoadmapItemAction, completeRoadmapItemAction } from "../actions";

export default async function RoadmapItemPage({
  params,
}: {
  params: Promise<{ roadmapItemId: string }>;
}) {
  const { roadmapItemId } = await params;
  const [{ readModel }, contextEngine, user] = await Promise.all([
    createRoadmapModule(),
    createContextEngine(),
    getAuthenticatedUser(),
  ]);
  const [item, context] = await Promise.all([
    readModel.findById(roadmapItemId),
    contextEngine.get({ type: "roadmap-item", id: roadmapItemId }, new Date().toISOString(), user?.role ?? "engineer"),
  ]);
  if (!item) notFound();

  return (
    <main className="workspace-main module-main object-view object-view-roadmap">
      <Link className="back-link" href="/roadmap">
        ← Roadmap
      </Link>
      <div className="detail-heading object-hero">
        <div>
          <span className={`status-pill status-pill-${item.lifecycleStatus}`}>
            {ROADMAP_LIFECYCLE_STATUS_LABELS[item.lifecycleStatus]}
          </span>
          <p className="eyebrow">
            {ROADMAP_KIND_LABELS[item.kind]} · {ROADMAP_HORIZON_LABELS[item.horizon]}
          </p>
          <h1 className="display">{item.title}</h1>
          <p className="workspace-intro">{item.description}</p>
        </div>
        {item.lifecycleStatus === "active" && (
          <div className="detail-actions">
            <Link className="button-secondary" href={`/roadmap/${item.id}/edit`}>
              Editar
            </Link>
            <form action={completeRoadmapItemAction.bind(null, item.id)}>
              <button className="button-primary">Concluir</button>
            </form>
            <ConfirmAction
              action={abandonRoadmapItemAction.bind(null, item.id)}
              className="button-secondary"
              confirmation="Abandonar este Roadmap Item? A intenção sai dos horizontes ativos, mas permanece no histórico."
              pendingLabel="A abandonar…"
            >
              Abandonar
            </ConfirmAction>
          </div>
        )}
      </div>

      <div
        className="roadmap-axis"
        aria-label={`Horizonte ${ROADMAP_HORIZON_LABELS[item.horizon]}`}
        role="group"
      >
        {(["now", "next", "later"] as const).map((horizon) => (
          <span className={horizon === item.horizon ? "roadmap-axis-active" : ""} key={horizon}>
            {ROADMAP_HORIZON_LABELS[horizon]}
          </span>
        ))}
      </div>

      <div className="detail-grid roadmap-intent-grid">
        <Card className="roadmap-evidence-card" label="Evidência" wide>
          <p>{item.evidence}</p>
        </Card>
        <Card className="roadmap-owner-card" label="Owner">
          <p>{item.ownerDisplayName ?? "Sem owner assumido"}</p>
        </Card>
        <Card className="roadmap-horizon-card" label="Horizonte">
          <p>{ROADMAP_HORIZON_LABELS[item.horizon]}</p>
        </Card>
      </div>
      <ContextPanel context={context} />
    </main>
  );
}

function Card({
  children,
  className = "",
  label,
  wide = false,
}: {
  children: React.ReactNode;
  className?: string;
  label: string;
  wide?: boolean;
}) {
  return (
    <section className={`detail-card${wide ? " detail-card-wide" : ""} ${className}`}>
      <p className="eyebrow">{label}</p>
      {children}
    </section>
  );
}
