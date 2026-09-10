"use client";

import { useState, useTransition } from "react";
import { ArrowDownLeft, ArrowUpRight, ChevronDown, ChevronUp, Pencil } from "lucide-react";
import { updateInteractionBodyAction } from "@/app/(workspace)/relations/actions";
import { CONTACT_CHANNEL_LABELS } from "@/domain/relations/contact";
import type { ContactInteractionItem } from "@/projections/relations/relations-read-model";

const dateTime = new Intl.DateTimeFormat("pt-PT", { dateStyle: "medium", timeStyle: "short" });

export function ContactHistoryList({
  interactions,
}: {
  interactions: readonly ContactInteractionItem[];
}) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [localBodies, setLocalBodies] = useState<Record<string, string>>({});
  const [isPending, startTransition] = useTransition();

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

  const startEditing = (id: string, currentBody: string) => {
    setEditingId(id);
    setEditText(currentBody);
    setErrorMessage(null);
    setExpandedIds((prev) => new Set(prev).add(id));
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditText("");
    setErrorMessage(null);
  };

  const handleSave = (id: string) => {
    const trimmed = editText.trim();
    if (!trimmed) {
      setErrorMessage("A mensagem não pode estar vazia.");
      return;
    }
    setErrorMessage(null);
    startTransition(async () => {
      const res = await updateInteractionBodyAction(id, trimmed);
      if (res.success) {
        setLocalBodies((prev) => ({ ...prev, [id]: trimmed }));
        setEditingId(null);
      } else {
        setErrorMessage(res.error || "Não foi possível guardar as alterações.");
      }
    });
  };

  if (interactions.length === 0) {
    return <p className="crm-muted">Ainda não existem interações. O registo é feito em Contacts.</p>;
  }

  return (
    <div className="crm-contact-history">
      {interactions.map((item) => {
        const isExpanded = expandedIds.has(item.id);
        const currentBody = localBodies[item.id] ?? item.body;
        const isLong = currentBody.length > 120 || currentBody.includes("\n");
        const isEditing = editingId === item.id;

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
              {isEditing ? (
                <div className="crm-history-editing">
                  <textarea
                    aria-label="Mensagem da interação"
                    autoFocus
                    className="crm-history-edit-textarea"
                    disabled={isPending}
                    maxLength={12000}
                    onChange={(e) => setEditText(e.target.value)}
                    rows={4}
                    value={editText}
                  />
                  {errorMessage ? (
                    <p className="crm-history-edit-error">{errorMessage}</p>
                  ) : null}
                  <div className="crm-history-edit-actions">
                    <button
                      className="button-secondary"
                      disabled={isPending}
                      onClick={cancelEditing}
                      type="button"
                    >
                      Cancelar
                    </button>
                    <button
                      className="button-primary"
                      disabled={isPending || !editText.trim()}
                      onClick={() => handleSave(item.id)}
                      type="button"
                    >
                      {isPending ? "A guardar..." : "Guardar"}
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div
                    className={`crm-interaction-body${
                      isExpanded ? " crm-interaction-body-expanded" : " crm-interaction-body-clamped"
                    }`}
                  >
                    <div className="crm-history-view-content">
                      <p>{currentBody}</p>
                      <button
                        aria-label="Editar registo"
                        className="crm-history-edit-trigger"
                        onClick={() => startEditing(item.id, currentBody)}
                        type="button"
                      >
                        <Pencil aria-hidden="true" />
                        <span>Editar</span>
                      </button>
                    </div>
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
                </>
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
