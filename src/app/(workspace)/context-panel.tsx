import Link from "next/link";
import { ChevronDown } from "lucide-react";

import type { ContextSection, ObjectContext } from "@/projections/context-engine/context-engine";

export function ContextPanel({
  context,
  exclude = [],
  collapsible = false,
}: {
  context: ObjectContext;
  exclude?: readonly string[];
  collapsible?: boolean;
}) {
  const excluded = new Set(exclude);
  const sections = context.sections.filter((section) => !excluded.has(section.id));

  if (collapsible) {
    return (
      <details className="meeting-section context-disclosure">
        <summary className="context-disclosure-summary">
          <span className="context-disclosure-heading">
            <span className="eyebrow">Context Engine</span>
            <span className="display section-title" id="context-engine-title">
              Contexto operacional
            </span>
            <span className="muted-copy">
              Leitura calculada agora a partir das relações e fontes oficiais.
            </span>
          </span>
          <ChevronDown aria-hidden="true" className="context-disclosure-icon" />
        </summary>
        <ContextPanelBody context={context} sections={sections} />
      </details>
    );
  }

  return (
    <section className="meeting-section" aria-labelledby="context-engine-title">
      <div className="archive-heading">
        <p className="eyebrow">Context Engine</p>
        <h2 className="display section-title" id="context-engine-title">
          Contexto operacional
        </h2>
        <p className="muted-copy">
          Leitura calculada agora a partir das relações e fontes oficiais.
        </p>
        {context.isPartial && (
          <p className="risk-copy" role="status">
            O contexto está parcial. As fontes indisponíveis estão identificadas abaixo.
          </p>
        )}
      </div>
      <ContextPanelBody context={context} sections={sections} showPartialStatus={false} />
    </section>
  );
}

function ContextPanelBody({
  context,
  sections,
  showPartialStatus = true,
}: {
  context: ObjectContext;
  sections: readonly ContextSection[];
  showPartialStatus?: boolean;
}) {
  return (
    <div className="context-disclosure-body">
      {showPartialStatus && context.isPartial ? (
        <p className="risk-copy" role="status">
          O contexto está parcial. As fontes indisponíveis estão identificadas abaixo.
        </p>
      ) : null}
      <div className="detail-grid">
        {sections.map((section) => (
          <ContextSectionCard key={section.id} section={section} />
        ))}
      </div>
    </div>
  );
}

function ContextSectionCard({ section }: { section: ContextSection }) {
  return (
    <article className="detail-card detail-card-wide">
      <p className="eyebrow">{section.title}</p>
      <p className="muted-copy">Fonte oficial: {section.source}</p>
      {section.status === "ready" ? (
        <ul className="plain-list">
          {section.items.map((item) => (
            <li key={`${section.id}-${item.id}`}>
              {item.href ? <Link href={item.href}>{item.label}</Link> : item.label}
              {item.meta && <span>{item.meta}</span>}
            </li>
          ))}
        </ul>
      ) : (
        <p
          className={section.status === "error" ? "risk-copy" : "muted-copy"}
          role={section.status === "error" ? "status" : undefined}
        >
          {section.message}
        </p>
      )}
    </article>
  );
}
