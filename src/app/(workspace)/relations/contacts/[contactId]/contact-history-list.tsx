"use client";

import { useState } from "react";
import { ArrowDownLeft, ArrowUpRight, ChevronDown, ChevronUp } from "lucide-react";
import { CONTACT_CHANNEL_LABELS } from "@/domain/relations/contact";
import type { ContactInteractionItem } from "@/projections/relations/relations-read-model";

const dateTime = new Intl.DateTimeFormat("pt-PT", { dateStyle: "medium", timeStyle: "short" });

export function ContactHistoryList({
  interactions,
}: {
  interactions: readonly ContactInteractionItem[];
}) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const toggleExpand = (id: string) => {
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

  if (interactions.length === 0) {
    return <p className="crm-muted">Ainda não existem interações. O registo é feito em Contacts.</p>;
  }

  return (
    <div className="crm-contact-history">
      {interactions.map((item) => {
        const isExpanded = expandedIds.has(item.id);
        const isLong = item.body.length > 120 || item.body.includes("\n");

        return (
          <article
            className={`crm-interaction-card${isExpanded ? " crm-interaction-expanded" : ""}`}
            key={item.id}
          >
            <span className="interaction-icon">
              {item.direction === "outbound" ? (
                <ArrowUpRight aria-hidden="true" />
              ) : (
                <ArrowDownLeft aria-hidden="true" />
              )}
            </span>
            <div className="crm-interaction-main">
              <strong>{CONTACT_CHANNEL_LABELS[item.channel]}</strong>
              <div
                className={`crm-interaction-body${
                  isExpanded ? " crm-interaction-body-expanded" : " crm-interaction-body-clamped"
                }`}
              >
                <p>{item.body}</p>
              </div>
              {isLong && (
                <button
                  aria-expanded={isExpanded}
                  className="crm-interaction-expand-btn"
                  onClick={() => toggleExpand(item.id)}
                  type="button"
                >
                  <span>{isExpanded ? "Ver menos" : "Ver log completo"}</span>
                  {isExpanded ? (
                    <ChevronUp aria-hidden="true" />
                  ) : (
                    <ChevronDown aria-hidden="true" />
                  )}
                </button>
              )}
              <small>
                {item.recorderName}
                {item.hasReply ? " · com resposta" : ""}
              </small>
            </div>
            <time>{dateTime.format(new Date(item.occurredAt))}</time>
          </article>
        );
      })}
    </div>
  );
}
