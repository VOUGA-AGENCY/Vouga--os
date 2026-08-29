import Link from "next/link";
import { notFound } from "next/navigation";

import { getAuthenticatedUser } from "@/application/auth/current-user";
import { DECISION_REVIEW_EFFECT_LABELS, DECISION_STATUS_LABELS } from "@/domain/decisions/decision";
import { createContextEngine } from "@/foundation/composition/context-engine";
import { createDecisionModule } from "@/foundation/composition/decisions";
import type { RelatedDecision } from "@/projections/decisions/decision-read-model";
import { ContextPanel } from "../../context-panel";

export default async function DecisionDetailPage({
  params,
}: {
  params: Promise<{ decisionId: string }>;
}) {
  const { decisionId } = await params;
  const [{ readModel }, contextEngine, user] = await Promise.all([
    createDecisionModule(),
    createContextEngine(),
    getAuthenticatedUser(),
  ]);
  const [decision, context] = await Promise.all([
    readModel.findById(decisionId),
    contextEngine.get({ type: "decision", id: decisionId }, new Date().toISOString(), user?.role ?? "engineer"),
  ]);
  if (!decision) notFound();

  return (
    <main className="workspace-main module-main object-view object-view-decision">
      <Link className="back-link" href="/decisions">
        ← Decisions
      </Link>
      <div className="detail-heading object-hero">
        <div>
          <span className={`status-pill status-pill-${decision.status}`}>
            {DECISION_STATUS_LABELS[decision.status]}
          </span>
          <h1 className="display">{decision.title}</h1>
          <p className="workspace-intro">{decision.choice}</p>
        </div>
        {decision.status === "current" && (
          <div className="detail-actions">
            <Link className="button-secondary" href={`/tasks/new?decision=${decision.id}`}>
              New task from this decision
            </Link>
            <Link className="button-primary" href={`/decisions/${decision.id}/review`}>
              Review decision
            </Link>
          </div>
        )}
      </div>

      <div className="detail-grid decision-record-grid">
        <Card className="decision-choice-card" label="Escolha" wide>
          <p>{decision.choice}</p>
        </Card>
        <Card className="decision-reason-card" label="Motivo" wide>
          <p>{decision.reason}</p>
        </Card>
        <Card className="decision-alternatives-card" label="Alternativas" wide>
          <p className={decision.alternatives ? undefined : "muted-copy"}>
            {decision.alternatives ?? "Sem alternativas relevantes registadas."}
          </p>
        </Card>
        <Card className="decision-impact-card" label="Impacto" wide>
          <p>{decision.impact}</p>
        </Card>
        <Card className="decision-authority-card" label="Autoridade">
          <p>{decision.authorityDisplayName}</p>
        </Card>
        <Card className="decision-date-card" label="Data da decisão">
          <p>{formatDate(decision.decidedOn)}</p>
        </Card>
        <Card className="decision-origin-card" label="Meeting de origem" wide>
          <p className={decision.originMeetingTitle ? undefined : "muted-copy"}>
            {decision.originMeetingTitle ?? "Escolha tomada fora de Meeting."}
          </p>
        </Card>
        <HistoryCard previous={decision.previous} revisions={decision.revisions} />
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

function HistoryCard({
  previous,
  revisions,
}: {
  previous: RelatedDecision | null;
  revisions: readonly RelatedDecision[];
}) {
  return (
    <Card className="decision-history-card" label="Histórico de revisão" wide>
      {!previous && revisions.length === 0 ? (
        <p className="muted-copy">Esta Decision ainda não pertence a uma cadeia de revisão.</p>
      ) : (
        <ul className="plain-list">
          {previous && (
            <li>
              <Link href={`/decisions/${previous.id}`}>← {previous.title}</Link>
              <span>{DECISION_REVIEW_EFFECT_LABELS[previous.effect]} esta Decision</span>
            </li>
          )}
          {revisions.map((revision) => (
            <li key={revision.id}>
              <Link href={`/decisions/${revision.id}`}>{revision.title} →</Link>
              <span>{DECISION_REVIEW_EFFECT_LABELS[revision.effect]} a escolha atual</span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-PT", { dateStyle: "long", timeZone: "UTC" }).format(
    new Date(`${value}T00:00:00Z`),
  );
}
