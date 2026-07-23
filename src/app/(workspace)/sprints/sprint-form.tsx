"use client";
import Link from "next/link";
import { useActionState } from "react";
import type { SprintFormOptions } from "@/application/sprints/contracts";
import {
  FormFeedback,
  FormFields,
  FormSubmit,
  RequiredFieldsNote,
} from "@/foundation/ui/form-controls";
import type { SprintFormState } from "./actions";
type Action = (state: SprintFormState, data: FormData) => Promise<SprintFormState>;
export function SprintForm({ action, options }: { action: Action; options: SprintFormOptions }) {
  const [state, formAction] = useActionState(action, { message: null });
  return (
    <form action={formAction} className="company-form object-form object-form-sprint">
      <RequiredFieldsNote />
      <FormFields>
        <div className="company-form-grid object-form-grid">
          <div className="field field-light company-form-wide">
            <label htmlFor="name">Nome</label>
            <input
              id="name"
              maxLength={160}
              name="name"
              placeholder="Ex.: Sprint 18 · Fechar proposta e entrega"
              required
            />
          </div>
          <div className="field field-light company-form-wide">
            <label htmlFor="intended_result">Resultado pretendido</label>
            <textarea
              id="intended_result"
              maxLength={2000}
              name="intended_result"
              placeholder="Ex.: Proposta aprovada e primeira entrega validada pelo cliente."
              required
              rows={3}
            />
          </div>
          <div className="field field-light">
            <label htmlFor="owner_member_id">Owner do ciclo</label>
            <select
              defaultValue={options.members[0]?.id}
              id="owner_member_id"
              name="owner_member_id"
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
            <label htmlFor="starts_on">Início</label>
            <input id="starts_on" name="starts_on" required type="date" />
          </div>
          <div className="field field-light">
            <label htmlFor="ends_on">Fim acordado</label>
            <input id="ends_on" name="ends_on" required type="date" />
          </div>
          <div className="field field-light company-form-wide">
            <label htmlFor="material_risks">Riscos materiais</label>
            <textarea
              id="material_risks"
              maxLength={4000}
              name="material_risks"
              placeholder="Ex.: Aprovação jurídica pode impedir o resultado dentro desta janela."
              rows={3}
            />
          </div>
          <fieldset className="choice-field company-form-wide">
            <legend>Tasks assumidas</legend>
            <p className="field-help">
              Seleciona trabalho já existente. Os owners e a origem das Tasks não mudam.
            </p>
            <div className="choice-grid">
              {options.tasks.map((task) => (
                <label className="choice-option" key={task.id}>
                  <input name="task_id" type="checkbox" value={task.id} />
                  <span>
                    {task.title}
                    <small>{task.ownerDisplayName}</small>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
        </div>
      </FormFields>
      <FormFeedback message={state.message} />
      <div className="form-actions">
        <FormSubmit idleLabel="Save sprint" pendingLabel="Saving…" />
        <Link className="button-secondary" href="/sprints">
          Cancelar
        </Link>
      </div>
    </form>
  );
}
