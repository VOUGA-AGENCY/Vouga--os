import Link from "next/link";

import { DECISION_STATUS_LABELS, type DecisionStatus } from "@/domain/decisions/decision";
import { createDecisionModule } from "@/foundation/composition/decisions";
import type { DecisionListItem } from "@/projections/decisions/decision-read-model";

export default async function DecisionsPage() {
  const { readModel } = await createDecisionModule();
  const decisions = await readModel.list();
  const groups: [DecisionStatus, string][] = [
    ["current", "Vigentes"],
    ["superseded", "Substituídas"],
    ["revoked", "Revogadas"],
  ];

  return (
    <main className="workspace-main module-main">
      <div className="module-heading">
        <div>
          <h1 className="display">Decisions</h1>
          <p className="workspace-intro">Escolhas que continuam a orientar o trabalho.</p>
        </div>
        <Link className="button-primary" href="/decisions/new">
          New decision
        </Link>
      </div>

      {decisions.length === 0 ? (
        <section className="empty-state">
          <p className="eyebrow">Empty</p>
          <h2 className="display">No decisions yet.</h2>
          <p>Guarda a primeira escolha que deve orientar trabalho futuro.</p>
          <Link className="button-secondary" href="/decisions/new">
            New decision
          </Link>
        </section>
      ) : (
        groups.map(([status, title]) => {
          const items = decisions.filter((decision) => decision.status === status);
          return items.length > 0 ? (
            <DecisionSection
              decisions={items}
              key={status}
              secondary={status !== "current"}
              title={title}
            />
          ) : null;
        })
      )}
    </main>
  );
}

function DecisionSection({
  decisions,
  title,
  secondary,
}: {
  decisions: DecisionListItem[];
  title: string;
  secondary: boolean;
}) {
  return (
    <section className={`collection-section${secondary ? " collection-section-secondary" : ""}`}>
      <div className="collection-heading">
        <div>
          <p className="eyebrow">
            {decisions.length} {decisions.length === 1 ? "Decision" : "Decisions"}
          </p>
          <h2 className="section-title">{title}</h2>
        </div>
        <p>
          {secondary
            ? "Histórico preservado sem reescrever a escolha original."
            : "Escolhas que continuam a orientar o trabalho."}
        </p>
      </div>
      <div className="collection-list collection-list-decision">
        {decisions.map((decision) => (
          <Link
            className="collection-row collection-row-decision"
            href={`/decisions/${decision.id}`}
            key={decision.id}
          >
            <time className="collection-index" dateTime={decision.decidedOn}>
              {formatShortDate(decision.decidedOn)}
            </time>
            <div className="collection-primary">
              <span className={`status-pill status-pill-${decision.status}`}>
                {DECISION_STATUS_LABELS[decision.status]}
              </span>
              <h2>{decision.title}</h2>
              <p>{decision.choice}</p>
            </div>
            <div className="collection-meta">
              <span>
                <b>Autoridade</b>
                {decision.authorityDisplayName}
              </span>
              <span>
                <b>Decidida</b>
                {formatDate(decision.decidedOn)}
              </span>
              {decision.originMeetingTitle && (
                <span>
                  <b>Origem</b>
                  {decision.originMeetingTitle}
                </span>
              )}
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-PT", { dateStyle: "medium", timeZone: "UTC" }).format(
    new Date(`${value}T00:00:00Z`),
  );
}

function formatShortDate(value: string) {
  return new Intl.DateTimeFormat("pt-PT", {
    month: "short",
    year: "2-digit",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00Z`));
}
