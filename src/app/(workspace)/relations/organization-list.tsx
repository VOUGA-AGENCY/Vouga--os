"use client";

import Link from "next/link";
import { Building2, ChevronDown } from "lucide-react";
import { useState } from "react";

type OrganizationRow = Readonly<{
  href: string;
  id: string;
  name: string;
  cae: string | null;
  note: string | null;
  owner: string;
  stage: string;
  stageClassName: string;
}>;

export function OrganizationList({ rows }: { rows: readonly OrganizationRow[] }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return rows.map((row) => {
    const expanded = expandedId === row.id;
    const hasNote = Boolean(row.note);

    return (
      <article
        className={`crm-organisation-row${expanded ? " crm-organisation-row-expanded" : ""}`}
        key={row.id}
      >
        <Link className="crm-organisation-row-main" href={row.href}>
          <span className="crm-icon">
            <Building2 aria-hidden="true" />
          </span>
          <strong>{row.name}</strong>
          <span className="crm-card-field crm-cae-field" data-label="CAE">
            {row.cae ?? "—"}
          </span>
          <span className="crm-card-field" data-label="Owner">
            {row.owner || "—"}
          </span>
          <span className={`crm-card-field${row.stageClassName}`} data-label="Estado">
            {row.stage}
          </span>
          {!expanded ? (
            <span className="crm-organisation-note-preview">{row.note ?? "Sem notas"}</span>
          ) : null}
        </Link>
        {hasNote ? (
          <button
            aria-expanded={expanded}
            aria-label={`${expanded ? "Recolher" : "Expandir"} nota de ${row.name}`}
            className="crm-organisation-note-toggle"
            onClick={() => setExpandedId(expanded ? null : row.id)}
            type="button"
          >
            <ChevronDown aria-hidden="true" />
          </button>
        ) : null}
        {expanded ? (
          <p className="crm-organisation-note-full">
            <strong>Notas: </strong>
            {row.note}
          </p>
        ) : null}
      </article>
    );
  });
}
