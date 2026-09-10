"use client";

import Link from "next/link";
import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { CONTACT_CHANNEL_LABELS } from "@/domain/relations/contact";
import { withReturnTo } from "@/foundation/navigation/return-to";
import type { CompanyInteractionItem } from "@/projections/relations/relations-read-model";

const fullDate = new Intl.DateTimeFormat("pt-PT", { dateStyle: "medium", timeStyle: "short" });

export function CompanyHistoryList({
  history,
  companyHref,
}: {
  history: readonly CompanyInteractionItem[];
  companyHref: string;
}) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const toggle = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  if (history.length === 0) {
    return <p className="crm-muted">Ainda não existem interações.</p>;
  }

  return (
    <div className="crm-company-history">
      {history.map((item) => {
        const isExpanded = expandedIds.has(item.id);

        return (
          <article
            className={`crm-company-history-row${isExpanded ? " crm-company-history-row-expanded" : ""}`}
            key={item.id}
          >
            <div className="crm-company-history-main">
              <span>{CONTACT_CHANNEL_LABELS[item.channel]}</span>
              {item.contactId ? (
                <Link
                  className="crm-company-history-contact-link"
                  href={withReturnTo(`/relations/contacts/${item.contactId}`, companyHref)}
                >
                  <strong>{item.contactName}</strong>
                </Link>
              ) : (
                <strong>{item.contactName ?? "Sem perfil específico"}</strong>
              )}
              <p className="crm-company-history-preview">{item.body}</p>
              <time>{fullDate.format(new Date(item.occurredAt))}</time>
              <button
                aria-expanded={isExpanded}
                aria-label={`${isExpanded ? "Recolher" : "Expandir"} registo`}
                className="crm-company-history-toggle"
                onClick={() => toggle(item.id)}
                type="button"
              >
                <ChevronDown aria-hidden="true" />
              </button>
            </div>

            {isExpanded && (
              <div className="crm-company-history-full">
                <p>{item.body}</p>
              </div>
            )}
          </article>
        );
      })}
    </div>
  );
}
