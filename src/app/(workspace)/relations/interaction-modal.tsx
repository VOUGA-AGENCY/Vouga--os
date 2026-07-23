"use client";

import { Plus, X } from "lucide-react";
import { useMemo, useState } from "react";
import type { ContactChannel } from "@/domain/relations/contact";
import {
  PROSPECTING_STAGE_LABELS,
  PROSPECTING_STAGES,
} from "@/domain/companies/company";
import { FormSubmit } from "@/foundation/ui/form-controls";
import type { MessageTemplateItem } from "@/projections/relations/relations-read-model";
import { recordContactInteractionAction } from "./actions";

type ContactPair = Readonly<{
  companyId: string;
  companyName: string;
  contactId: string;
  contactName: string;
}>;

export function InteractionModal({
  pairs,
  templates,
  segment,
}: {
  pairs: readonly ContactPair[];
  templates: readonly MessageTemplateItem[];
  segment: "prospecting" | "internal";
}) {
  const [open, setOpen] = useState(false);
  const [channel, setChannel] = useState<ContactChannel>("linkedin");
  const [body, setBody] = useState("");
  const [templateId, setTemplateId] = useState("");
  const availableTemplates = useMemo(
    () => templates.filter((template) => template.status === "active"),
    [templates],
  );

  function chooseTemplate(id: string) {
    setTemplateId(id);
    const template = availableTemplates.find((item) => item.id === id);
    if (!template) return;
    setChannel(template.channel);
    setBody(template.body);
  }

  return (
    <>
      <button className="button-primary" onClick={() => setOpen(true)} type="button">
        <Plus aria-hidden="true" />
        Nova interação
      </button>
      {open ? (
        <div className="crm-modal-backdrop" onMouseDown={() => setOpen(false)}>
          <section
            aria-labelledby="new-interaction-title"
            aria-modal="true"
            className="crm-interaction-modal"
            onMouseDown={(event) => event.stopPropagation()}
            role="dialog"
          >
            <header>
              <h2 id="new-interaction-title">Nova interação</h2>
              <button aria-label="Fechar" onClick={() => setOpen(false)} type="button">
                <X aria-hidden="true" />
              </button>
            </header>
            <form action={recordContactInteractionAction}>
              <input name="return_segment" type="hidden" value={segment} />
              <div className="field">
                <label htmlFor="contact_pair">Perfil e Organisation</label>
                <select id="contact_pair" name="contact_pair" required>
                  <option value="">Selecionar</option>
                  {pairs.map((pair) => (
                    <option
                      key={`${pair.companyId}:${pair.contactId}`}
                      value={`${pair.companyId}:${pair.contactId}`}
                    >
                      {pair.companyName} · {pair.contactName}
                    </option>
                  ))}
                </select>
              </div>
              <div className="crm-modal-grid">
                <div className="field">
                  <label htmlFor="interaction_channel">Tipo</label>
                  <select
                    id="interaction_channel"
                    name="channel"
                    onChange={(event) => {
                      setChannel(event.target.value as ContactChannel);
                      setTemplateId("");
                    }}
                    value={channel}
                  >
                    <option value="call">Chamada</option>
                    <option value="email">Email</option>
                    <option value="linkedin">LinkedIn</option>
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="interaction_stage">Atualizar estado</label>
                  <select defaultValue="contacted" id="interaction_stage" name="stage">
                    {PROSPECTING_STAGES.map((stage) => (
                      <option key={stage} value={stage}>
                        {PROSPECTING_STAGE_LABELS[stage]}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="field">
                <label htmlFor="source_template_id">Guião</label>
                <select
                  id="source_template_id"
                  name="source_template_id"
                  onChange={(event) => chooseTemplate(event.target.value)}
                  value={templateId}
                >
                  <option value="">Escrever na hora</option>
                  {availableTemplates.map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.name} · {template.situation}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="interaction_body">Mensagem</label>
                <textarea
                  id="interaction_body"
                  maxLength={12000}
                  name="body"
                  onChange={(event) => setBody(event.target.value)}
                  placeholder="Escreve a interação."
                  required
                  rows={7}
                  value={body}
                />
              </div>
              <footer>
                <button className="button-secondary" onClick={() => setOpen(false)} type="button">
                  Cancelar
                </button>
                <FormSubmit idleLabel="Guardar interação" pendingLabel="A guardar…" />
              </footer>
            </form>
          </section>
        </div>
      ) : null}
    </>
  );
}
