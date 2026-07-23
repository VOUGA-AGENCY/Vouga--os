import Link from "next/link";

import { DECISION_STATUS_LABELS } from "@/domain/decisions/decision";
import type { DecisionListItem } from "@/projections/decisions/decision-read-model";

export function RelatedDecisionList({ decisions }: { decisions: DecisionListItem[] }) {
  return (
    <section className="detail-card detail-card-wide">
      <p className="eyebrow">Decisions relacionadas</p>
      {decisions.length === 0 ? (
        <p className="muted-copy">Sem Decisions relacionadas.</p>
      ) : (
        <ul className="plain-list">
          {decisions.map((decision) => (
            <li key={decision.id}>
              <Link href={`/decisions/${decision.id}`}>{decision.title}</Link>
              <span>
                {DECISION_STATUS_LABELS[decision.status]} · {decision.authorityDisplayName}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
