"use client";
import Link from "next/link";
import { useActionState } from "react";
import { SPRINT_CLOSURE_DISPOSITION_LABELS } from "@/domain/sprints/sprint";
import { TASK_STATUS_LABELS } from "@/domain/tasks/task";
import {
  FormFeedback,
  FormFields,
  FormSubmit,
  RequiredFieldsNote,
} from "@/foundation/ui/form-controls";
import type { SprintDetail } from "@/projections/sprints/sprint-read-model";
import type { SprintFormState } from "../../actions";
type Action = (state: SprintFormState, data: FormData) => Promise<SprintFormState>;
export function CloseSprintForm({ action, sprint }: { action: Action; sprint: SprintDetail }) {
  const [state, formAction] = useActionState(action, { message: null });
  return (
    <form action={formAction} className="company-form object-form object-form-sprint">
      <RequiredFieldsNote />
      <FormFields>
        <div className="company-form-grid object-form-grid">
          <div className="field field-light company-form-wide">
            <label htmlFor="actual_result">Resultado real</label>
            <textarea
              id="actual_result"
              maxLength={4000}
              name="actual_result"
              placeholder="Ex.: A proposta foi aprovada; a primeira entrega ficou validada com uma alteração menor."
              required
              rows={4}
            />
          </div>
          <div className="field field-light company-form-wide">
            <label htmlFor="learning">Aprendizagem principal</label>
            <textarea
              id="learning"
              maxLength={4000}
              name="learning"
              placeholder="Ex.: Validar o critério de aceitação antes do início reduziu retrabalho no fecho."
              required
              rows={4}
            />
          </div>
          <fieldset className="choice-field company-form-wide">
            <legend>Destino de cada compromisso</legend>
            <p className="field-help">
              Tasks concluídas ou canceladas recebem o destino automaticamente. As restantes exigem
              uma decisão explícita, sem transferência automática.
            </p>
            <div className="closure-list">
              {sprint.tasks.map((task) => {
                const terminal = task.status === "completed" || task.status === "cancelled";
                return (
                  <div className="closure-row" key={task.taskId}>
                    <div>
                      <strong>{task.title}</strong>
                      <small>
                        {TASK_STATUS_LABELS[task.status]} · {task.ownerDisplayName}
                      </small>
                    </div>
                    {terminal ? (
                      <span>
                        {task.status === "completed"
                          ? SPRINT_CLOSURE_DISPOSITION_LABELS.completed
                          : SPRINT_CLOSURE_DISPOSITION_LABELS.cancelled}
                      </span>
                    ) : (
                      <select
                        aria-label={`Destino de ${task.title}`}
                        name={`disposition:${task.taskId}`}
                        required
                        defaultValue=""
                      >
                        <option value="" disabled>
                          Selecionar destino
                        </option>
                        <option value="recommitted">Nova assunção futura</option>
                        <option value="split">Dividida</option>
                        <option value="returned_to_future">Devolvida ao trabalho futuro</option>
                        <option value="cancelled">Cancelada</option>
                      </select>
                    )}
                  </div>
                );
              })}
            </div>
          </fieldset>
        </div>
      </FormFields>
      <FormFeedback message={state.message} />
      <div className="form-actions">
        <FormSubmit idleLabel="Close sprint" pendingLabel="Closing…" />
        <Link className="button-secondary" href={`/sprints/${sprint.id}`}>
          Voltar
        </Link>
      </div>
    </form>
  );
}
