"use client";

import Link from "next/link";
import { useActionState } from "react";

import {
  FormFeedback,
  FormFields,
  FormSubmit,
  RequiredFieldsNote,
} from "@/foundation/ui/form-controls";
import { closeMeetingAction, type MeetingFormState } from "../../actions";

const initialState: MeetingFormState = { message: null };

export function CloseMeetingForm({ meetingId, returnTo }: { meetingId: string; returnTo: string }) {
  const action = closeMeetingAction.bind(null, meetingId);
  const [state, formAction] = useActionState(action, initialState);

  return (
    <form action={formAction} className="company-form object-form object-form-meeting">
      <RequiredFieldsNote />
      <input name="return_to" type="hidden" value={returnTo} />
      <FormFields>
        <div className="field field-light">
          <label htmlFor="conclusion">Output</label>
          <textarea
            id="conclusion"
            maxLength={4000}
            name="conclusion"
            placeholder="Ex.: Ficaram alinhadas as prioridades do mês, os bloqueios foram esclarecidos e o próximo ponto de situação será na sexta-feira."
            required
            rows={7}
          />
        </div>
      </FormFields>
      <FormFeedback message={state.message} />
      <div className="form-actions">
        <FormSubmit idleLabel="Save output" pendingLabel="Saving…" />
        <Link className="button-secondary" href={returnTo}>
          Cancelar
        </Link>
      </div>
    </form>
  );
}
