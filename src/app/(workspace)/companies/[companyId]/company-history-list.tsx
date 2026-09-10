"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { ChevronDown, Pencil } from "lucide-react";
import { updateInteractionBodyAction } from "@/app/(workspace)/relations/actions";
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
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [localBodies, setLocalBodies] = useState<Record<string, string>>({});
  const [isPending, startTransition] = useTransition();

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
      const res = await updateInteractionBodyAction(id, trimmed, companyHref);
      if (res.success) {
        setLocalBodies((prev) => ({ ...prev, [id]: trimmed }));
        setEditingId(null);
      } else {
        setErrorMessage(res.error || "Não foi possível guardar as alterações.");
      }
    });
  };

  if (history.length === 0) {
    return <p className="crm-muted">Ainda não existem interações.</p>;
  }

  return (
    <div className="crm-company-history">
      {history.map((item) => {
        const isExpanded = expandedIds.has(item.id);
        const currentBody = localBodies[item.id] ?? item.body;
        const isEditing = editingId === item.id;

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
              <p className="crm-company-history-preview">{currentBody}</p>
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
                )}
              </div>
            )}
          </article>
        );
      })}
    </div>
  );
}
