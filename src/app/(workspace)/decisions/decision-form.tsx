"use client";

import Link from "next/link";
import { useActionState, useState } from "react";

import type { DecisionFormOptions } from "@/application/decisions/contracts";
import {
  DECISION_REVIEW_EFFECT_LABELS,
  type DecisionReviewEffect,
} from "@/domain/decisions/decision";
import { TASK_STATUS_LABELS } from "@/domain/tasks/task";
import type { DecisionDetail } from "@/projections/decisions/decision-read-model";
import {
  FormFeedback,
  FormFields,
  FormSubmit,
  RequiredFieldsNote,
} from "@/foundation/ui/form-controls";

import type { DecisionFormState } from "./actions";

type Action = (state: DecisionFormState, data: FormData) => Promise<DecisionFormState>;

export function DecisionForm({
  action,
  options,
  decidedOn,
  defaultOriginMeetingId,
  previous,
}: {
  action: Action;
  options: DecisionFormOptions;
  decidedOn: string;
  defaultOriginMeetingId?: string;
  previous?: DecisionDetail;
}) {
  const [state, formAction] = useActionState(action, { message: null });
  const [originMeetingId, setOriginMeetingId] = useState(defaultOriginMeetingId ?? "");

  return (
    <form action={formAction} className="company-form object-form object-form-decision">
      <RequiredFieldsNote />
      <FormFields>
        <div className="company-form-grid object-form-grid">
          {previous && (
            <div className="field field-light company-form-wide">
              <label htmlFor="review_effect">Efeito sobre a Decision anterior</label>
              <select defaultValue="supersedes" id="review_effect" name="review_effect" required>
                {(
                  Object.entries(DECISION_REVIEW_EFFECT_LABELS) as [DecisionReviewEffect, string][]
                ).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
              <p className="field-help">
                Substituir e revogar encerram a vigência anterior; limitar mantém a escolha anterior
                vigente no âmbito que sobra.
              </p>
            </div>
          )}

          <div className="field field-light company-form-wide">
            <label htmlFor="title">Título</label>
            <input
              id="title"
              maxLength={160}
              name="title"
              placeholder="Ex.: Manter o acesso ao Vouga OS fechado"
              required
            />
          </div>
          <div className="field field-light company-form-wide">
            <label htmlFor="choice">Escolha tomada</label>
            <textarea
              id="choice"
              maxLength={4000}
              name="choice"
              placeholder="Ex.: Provisionar manualmente todos os utilizadores durante a V1."
              required
              rows={4}
            />
          </div>
          <div className="field field-light company-form-wide">
            <label htmlFor="reason">Motivo</label>
            <textarea
              id="reason"
              maxLength={4000}
              name="reason"
              placeholder="Ex.: A equipa é pequena e ainda não existe necessidade validada de signup público."
              required
              rows={4}
            />
          </div>
          <div className="field field-light company-form-wide">
            <label htmlFor="alternatives">Alternativas relevantes</label>
            <textarea
              id="alternatives"
              maxLength={4000}
              name="alternatives"
              placeholder="Opcional. Ex.: Signup aberto; convites automáticos; SSO."
              rows={3}
            />
          </div>
          <div className="field field-light company-form-wide">
            <label htmlFor="impact">Impacto</label>
            <textarea
              id="impact"
              maxLength={4000}
              name="impact"
              placeholder="Ex.: O acesso permanece restrito e a gestão de utilizadores continua manual."
              required
              rows={4}
            />
          </div>
          <div className="field field-light">
            <label htmlFor="authority_member_id">Autoridade</label>
            <select
              defaultValue={options.members[0]?.id}
              id="authority_member_id"
              name="authority_member_id"
              required
            >
              {options.members.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.displayName} · {member.email}
                </option>
              ))}
            </select>
          </div>
          <div className="field field-light">
            <label htmlFor="decided_on">Data da decisão</label>
            <input
              defaultValue={decidedOn}
              id="decided_on"
              name="decided_on"
              required
              type="date"
            />
          </div>
          <div className="field field-light company-form-wide">
            <label htmlFor="origin_meeting_id">Meeting de origem</label>
            <select
              id="origin_meeting_id"
              name="origin_meeting_id"
              onChange={(event) => setOriginMeetingId(event.target.value)}
              value={originMeetingId}
            >
              <option value="">Escolha tomada fora de Meeting</option>
              {options.meetings.map((meeting) => (
                <option key={meeting.id} value={meeting.id}>
                  {meeting.title}
                </option>
              ))}
            </select>
          </div>

          <fieldset className="choice-field company-form-wide">
            <legend>Organisations afetadas</legend>
            {options.companies.length === 0 ? (
              <p className="muted-copy">Sem Organisations disponíveis.</p>
            ) : (
              <div className="choice-grid">
                {options.companies.map((company) => (
                  <label className="choice-option" key={company.id}>
                    <input name="company_id" type="checkbox" value={company.id} />
                    <span>
                      {company.name}
                      {company.archived && <small>Arquivada</small>}
                    </span>
                  </label>
                ))}
              </div>
            )}
          </fieldset>

          <fieldset className="choice-field company-form-wide">
            <legend>Meetings afetadas</legend>
            {options.meetings.length === 0 ? (
              <p className="muted-copy">Sem Meetings disponíveis.</p>
            ) : (
              <div className="choice-grid">
                {options.meetings.map((meeting) => {
                  const automatic = meeting.id === originMeetingId;
                  return (
                    <label className="choice-option" key={meeting.id}>
                      {automatic ? (
                        <input checked disabled type="checkbox" />
                      ) : (
                        <input name="meeting_id" type="checkbox" value={meeting.id} />
                      )}
                      <span>
                        {meeting.title}
                        <small>
                          {automatic
                            ? "Incluída automaticamente por ser a origem."
                            : new Intl.DateTimeFormat("pt-PT", { dateStyle: "medium" }).format(
                                new Date(meeting.startsAt),
                              )}
                        </small>
                      </span>
                    </label>
                  );
                })}
              </div>
            )}
          </fieldset>

          <fieldset className="choice-field company-form-wide">
            <legend>Tasks afetadas</legend>
            {options.tasks.length === 0 ? (
              <p className="muted-copy">Sem Tasks disponíveis.</p>
            ) : (
              <div className="choice-grid">
                {options.tasks.map((task) => (
                  <label className="choice-option" key={task.id}>
                    <input name="task_id" type="checkbox" value={task.id} />
                    <span>
                      {task.title}
                      <small>{TASK_STATUS_LABELS[task.status]}</small>
                    </span>
                  </label>
                ))}
              </div>
            )}
          </fieldset>
        </div>
      </FormFields>

      <FormFeedback message={state.message} />
      <div className="form-actions">
        <FormSubmit idleLabel={previous ? "Save review" : "Save decision"} />
        <Link
          className="button-secondary"
          href={previous ? `/decisions/${previous.id}` : "/decisions"}
        >
          Cancelar
        </Link>
      </div>
    </form>
  );
}
